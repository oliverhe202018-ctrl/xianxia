import { REALMS, getRequiredExp, getTotalDamageMultiplier } from '../config/RealmConfig';

export class RealmSystem {
    private static instance: RealmSystem;

    // 当前玩家修为状态
    private realmId: number = 1;
    private subLevel: number = 1;
    private exp: number = 0;
    private pills: number = 0;

    // 是否处于瓶颈期（9层且经验已满，需要渡劫）
    private isBottleneck: boolean = false;

    private constructor() {}

    public static getInstance(): RealmSystem {
        if (!RealmSystem.instance) {
            RealmSystem.instance = new RealmSystem();
        }
        return RealmSystem.instance;
    }

    /**
     * 初始化或从数据库恢复状态
     */
    public loadState(realmId: number, subLevel: number, exp: number, pills: number) {
        this.realmId = realmId;
        this.subLevel = subLevel;
        this.exp = exp;
        this.pills = pills;
        this.checkBottleneck();
    }

    private checkBottleneck() {
        const required = getRequiredExp(this.realmId, this.subLevel);
        if (this.subLevel === 9 && this.exp >= required && this.realmId < 10) {
            this.exp = required; // 严格截断
            this.isBottleneck = true;
        } else {
            this.isBottleneck = false;
        }
    }

    /**
     * 增加修为 (严谨防并发溢出算法)
     * @param amount 获得的经验值
     */
    public addExp(amount: number): void {
        if (amount <= 0) return;
        if (this.realmId >= 10 && this.subLevel >= 9) {
            return; // 已经是最高境界真仙九层，无法再提升
        }

        this.exp += amount;

        // 核心：使用 while 循环逐层突破小境界，防止海量经验一次性涌入造成的越界
        while (true) {
            const required = getRequiredExp(this.realmId, this.subLevel);
            
            // 经验不足以升层，跳出
            if (this.exp < required) break;

            // 经验足够，判断是否处于 9 层瓶颈
            if (this.subLevel === 9) {
                // 卡在瓶颈，溢出的经验被锁定丢弃，防止囤积经验无限连破大境界
                this.exp = required;
                this.isBottleneck = true;
                console.log(`[RealmSystem] 达到 ${this.getRealmName()} 瓶颈！修为停止增长，需服用渡劫丹尝试突破。`);
                break;
            } else {
                // 正常晋升小境界
                this.exp -= required;
                this.subLevel++;
                console.log(`[RealmSystem] 突破！当前境界：${this.getRealmName()}`);
            }
        }
    }

    public addPills(amount: number) {
        this.pills += amount;
    }

    /**
     * 尝试突破大境界
     */
    public attemptBreakthrough(): { success: boolean, message: string } {
        if (!this.isBottleneck) {
            return { success: false, message: "尚未达到大境界瓶颈，无法渡劫。" };
        }

        const realm = REALMS.find(r => r.id === this.realmId);
        if (!realm) return { success: false, message: "境界异常。" };

        // 校验渡劫丹
        if (this.pills < realm.requiredPills) {
            return { success: false, message: `渡劫丹不足！需要 ${realm.requiredPills} 颗，当前仅有 ${this.pills} 颗。` };
        }

        // 扣除材料
        this.pills -= realm.requiredPills;

        // 概率判定
        const rand = Math.random();
        if (rand <= realm.baseSuccessRate) {
            // 突破成功
            this.realmId++;
            this.subLevel = 1;
            this.exp = 0; // 溢出的那部分经验不继承
            this.isBottleneck = false;
            
            const newRealmName = REALMS.find(r => r.id === this.realmId)?.name;
            return { success: true, message: `天降祥瑞！恭喜突破至大境界：【${newRealmName}】！` };
        } else {
            // 突破失败，走火入魔惩罚：修为倒退当前层所需的 30%
            const required = getRequiredExp(this.realmId, this.subLevel);
            const penalty = Math.floor(required * 0.3);
            this.exp = Math.max(0, this.exp - penalty);
            this.isBottleneck = false; // 掉出瓶颈期，需要重新积攒经验
            
            return { success: false, message: `渡劫失败！雷劫凶猛，走火入魔，损失了部分修为...` };
        }
    }

    // --- Getter 属性 ---
    public getRealmName(): string {
        const realm = REALMS.find(r => r.id === this.realmId);
        return `${realm?.name}期 第${this.subLevel}层`;
    }

    public getGlobalDamageMultiplier(): number {
        return getTotalDamageMultiplier(this.realmId, this.subLevel);
    }
    
    public getRealmState() {
        return {
            realmId: this.realmId,
            subLevel: this.subLevel,
            exp: this.exp,
            requiredExp: getRequiredExp(this.realmId, this.subLevel),
            pills: this.pills,
            isBottleneck: this.isBottleneck,
            damageMultiplier: this.getGlobalDamageMultiplier()
        };
    }
}
