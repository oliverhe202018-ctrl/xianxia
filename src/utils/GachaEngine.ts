export interface GachaItem {
    id: string;
    type: 'currency' | 'rune' | 'codex';
    name: string;
    weight: number; // 抽取权重，基于总权重 10000 计算，如 5 表示 0.05%
    isSuperRare: boolean; // 是否属于极品（用于重置或触发保底）
    value?: number; // 附带的数值，例如给 500 灵石
}

export interface GachaResult {
    item: GachaItem;
    isPityTriggered: boolean;
}

export class GachaEngine {
    private pool: GachaItem[];
    private superRarePool: GachaItem[];
    private totalWeight: number = 10000;
    private currentPoolWeight: number;

    constructor(pool: GachaItem[]) {
        this.pool = pool;
        this.superRarePool = pool.filter(item => item.isSuperRare);
        
        this.currentPoolWeight = this.pool.reduce((sum, item) => sum + item.weight, 0);
        if (this.currentPoolWeight !== this.totalWeight) {
            console.warn(`[GachaEngine] 警告：卡池总权重 ${this.currentPoolWeight} 不等于基数 ${this.totalWeight}，但依然兼容按比例分配。`);
        }
    }

    /**
     * 执行单次抽取
     * @param currentPity 当前的保底计数
     * @param pityThreshold 强制硬保底阈值
     */
    public drawOnce(currentPity: number, pityThreshold: number): GachaResult {
        // 1. 拦截触发硬保底：当累计未出极品的次数达到阈值
        if (currentPity >= pityThreshold - 1 && this.superRarePool.length > 0) {
            // 强行从极品池中等权重随机抽取一个（或者也可以按极品池内部的相对权重抽）
            const randIndex = Math.floor(Math.random() * this.superRarePool.length);
            return {
                item: this.superRarePool[randIndex],
                isPityTriggered: true
            };
        }

        // 2. 正常依照万分位权重随机抽取
        let rand = Math.random() * this.currentPoolWeight;
        for (const item of this.pool) {
            rand -= item.weight;
            if (rand <= 0) {
                return {
                    item: item,
                    isPityTriggered: false
                };
            }
        }

        // 兜底安全返回
        return { item: this.pool[0], isPityTriggered: false };
    }
}
