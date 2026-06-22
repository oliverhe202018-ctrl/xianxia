import { GachaEngine, GachaItem, GachaResult } from '../utils/GachaEngine';

// 模拟 PrismaClient 以防本地未连接真实库时报错
const prisma = {
    $transaction: async (queries: any[]) => {
        // 在真实环境中，这里会执行真正的数据库原子事务
        console.log(`[Prisma Mock] 正在执行由 ${queries.length} 个操作组成的数据库事务...`);
        return Promise.all(queries.map(q => q()));
    },
    user: {
        update: async (args: any) => {
            console.log(`[Prisma Mock] user.update:`, JSON.stringify(args, null, 2));
            return args.data;
        }
    }
};

// 预设奖池，总权重 10000。极品法印概率 0.45%，绝版图鉴 0.05%
const DEFAULT_POOL: GachaItem[] = [
    { id: 'currency_1', type: 'currency', name: '微光灵石 (10)', weight: 6000, isSuperRare: false, value: 10 },
    { id: 'currency_2', type: 'currency', name: '璀璨灵石 (100)', weight: 3000, isSuperRare: false, value: 100 },
    { id: 'rune_low', type: 'rune', name: '残破法印 (碎片)', weight: 950, isSuperRare: false },
    { id: 'rune_high', type: 'rune', name: '极品法印 (红品)', weight: 45, isSuperRare: true },
    { id: 'codex_rare', type: 'codex', name: '上古图鉴 (绝版)', weight: 5, isSuperRare: true },
];

export class GachaSystem {
    private static instance: GachaSystem;
    private engine: GachaEngine;
    private readonly PITY_THRESHOLD = 100; // 100抽硬保底

    private constructor() {
        this.engine = new GachaEngine(DEFAULT_POOL);
    }

    public static getInstance(): GachaSystem {
        if (!GachaSystem.instance) {
            GachaSystem.instance = new GachaSystem();
        }
        return GachaSystem.instance;
    }

    /**
     * 执行参悟（盲盒开箱）
     * 完全解耦表现层：返回 Promise 供 UI await，并在其间完成所有动画播放。
     * @param userId 操作的玩家ID
     * @param count 抽卡次数（如十连抽为 10）
     * @param currentScrolls 当前拥有的天书数量
     * @param currentPity 当前的保底计数器
     */
    public async openScroll(userId: string, count: number, currentScrolls: number, currentPity: number): Promise<GachaResult[]> {
        if (currentScrolls < count) {
            throw new Error('无字天书不足，无法参悟！');
        }

        const results: GachaResult[] = [];
        let tempPity = currentPity;

        // 1. 本地生成抽卡运算结果
        for (let i = 0; i < count; i++) {
            const res = this.engine.drawOnce(tempPity, this.PITY_THRESHOLD);
            results.push(res);
            
            // 如果出货极品，立刻重置保底计数；否则累加
            if (res.item.isSuperRare || res.isPityTriggered) {
                tempPity = 0; 
            } else {
                tempPity++;
            }
        }

        // 2. 将结果整合，构建 Prisma 事务 (Transaction)
        // 必须确保扣钱(天书)、发奖、刷新保底计数在同一个数据库动作内完成，防刷档
        let totalStones = 0;
        results.forEach(r => {
            if (r.item.type === 'currency' && r.item.value) {
                totalStones += r.item.value;
            }
        });

        // 压入事务队列
        const queries = [
            () => prisma.user.update({
                where: { id: userId },
                data: {
                    heavenly_scrolls: { decrement: count },
                    gacha_pity_counter: tempPity,
                    currency_gold: { increment: totalStones }
                    // 真实环境中还需将 rune/codex 发放至装备或背包关系表中
                }
            })
        ];

        // 模拟网络 I/O 延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        await prisma.$transaction(queries);

        console.log(`[GachaSystem] 玩家 ${userId} 参悟完成，消耗 ${count} 卷天书。获得灵石：${totalStones}`);
        return results;
    }
}
