import { UserStore } from '../store/UserStore';
import { GameState } from './GameState';
import { LevelManager } from '../config/LevelManager'; 

export class IdleSystem {
    private static instance: IdleSystem;
    
    // 每日免费扫荡次数限制
    private readonly MAX_FREE_SWEEPS = 3;
    private freeSweepsUsed = 0;

    private levelManager: LevelManager; 

    private constructor() {
        this.levelManager = new LevelManager(); 
    }

    public static getInstance(): IdleSystem {
        if (!IdleSystem.instance) {
            IdleSystem.instance = new IdleSystem();
        }
        return IdleSystem.instance;
    }

    /**
     * 重置每日次数（测试用或跨天时调用）
     */
    public resetDailySweeps() {
        this.freeSweepsUsed = 0;
    }

    /**
     * 扫荡已通关关卡
     * @param levelIndex 要扫荡的关卡号
     */
    public sweepLevel(levelIndex: number): { success: boolean, rewards?: number, message: string, isQuickBattle: boolean } {
        const isVip = UserStore.getInstance().getIsVip();

        // 次数校验
        if (!isVip) {
            if (this.freeSweepsUsed >= this.MAX_FREE_SWEEPS) {
                return { 
                    success: false, 
                    message: '今日免费扫荡次数已用尽，请激活 VIP 开启无限扫荡！', 
                    isQuickBattle: false 
                };
            }
            this.freeSweepsUsed++;
        }

        // 获取关卡难度，用于测算奖励
        const difficulty = this.levelManager.calculateDifficulty(levelIndex);
        
        // 根据波次和怪物数量估算应得的灵石
        let totalEnemies = 0;
        for (let w = 0; w < difficulty.waveCount; w++) {
            totalEnemies += (10 + w * 2); // 与 LevelManager 生成器的逻辑保持一致
        }

        const baseReward = totalEnemies * 5;
        // VIP 享受 30% 掉落特权
        const finalReward = isVip ? Math.ceil(baseReward * 1.3) : baseReward;

        // 发放奖励
        GameState.getInstance().addStones(finalReward);

        return { 
            success: true, 
            rewards: finalReward, 
            message: `扫荡成功！获得 ${finalReward} 灵石。`, 
            // VIP 开启快速战斗特权（给 UI 层的标识，可用于直接秒出结果或2倍速回放动画）
            isQuickBattle: isVip 
        };
    }
}
