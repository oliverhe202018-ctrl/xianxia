import { EventBus } from '../core/EventBus';
import { PuzzleConfigs, PuzzleLevelConfig } from '../config/PuzzleConfig';
import { TowerCharName } from '../config/GameConfig';

export enum GameMode {
    NORMAL = 'NORMAL',
    PUZZLE = 'PUZZLE'
}

export class GameModeAdapter {
    private static instance: GameModeAdapter;
    private currentMode: GameMode = GameMode.NORMAL;
    private currentPuzzle: PuzzleLevelConfig | null = null;
    private puzzleInventory: Record<string, { rank: number, count: number }> = {};

    private constructor() {}

    public static getInstance(): GameModeAdapter {
        if (!GameModeAdapter.instance) {
            GameModeAdapter.instance = new GameModeAdapter();
        }
        return GameModeAdapter.instance;
    }

    public enterPuzzleMode(puzzleId: string) {
        const config = PuzzleConfigs.find(p => p.id === puzzleId);
        if (!config) return;

        this.currentMode = GameMode.PUZZLE;
        this.currentPuzzle = config;
        this.puzzleInventory = JSON.parse(JSON.stringify(config.inventory));

        console.log(`[GameModeAdapter] 进入解谜模式: ${config.name}`);
        EventBus.emit('puzzle:start', { config: this.currentPuzzle });
    }

    public enterNormalMode() {
        this.currentMode = GameMode.NORMAL;
        this.currentPuzzle = null;
        console.log(`[GameModeAdapter] 恢复常规塔防模式`);
    }

    /**
     * 侵入点1：拦截聚灵。返回 true 表示已拦截处理，不执行后续常规逻辑
     */
    public interceptGacha(): boolean {
        if (this.currentMode === GameMode.PUZZLE) {
            console.log(`[GameModeAdapter] 解谜模式限制: 禁止花费灵石随机聚灵！`);
            
            // 按序释放库存塔，供解谜使用
            for (const [towerType, data] of Object.entries(this.puzzleInventory)) {
                if (data.count > 0) {
                    data.count--;
                    EventBus.emit('gacha:result', { charName: towerType as TowerCharName, rank: data.rank });
                    console.log(`[GameModeAdapter] 从残局库存下发: ${towerType} (阶数: ${data.rank})，剩余: ${data.count}`);
                    return true;
                }
            }
            console.log(`[GameModeAdapter] 残局限定资源已全部提取完毕！`);
            return true;
        }
        return false;
    }

    /**
     * 侵入点2：验证是否允许使用铲子
     */
    public canUseShovel(): boolean {
        if (this.currentMode === GameMode.PUZZLE) {
            if (this.currentPuzzle && this.currentPuzzle.allowedShovels > 0) {
                this.currentPuzzle.allowedShovels--;
                return true;
            }
            console.log(`[GameModeAdapter] 解谜模式限制: 不可挖开障碍物！`);
            return false;
        }
        return true; // 正常模式
    }
}
