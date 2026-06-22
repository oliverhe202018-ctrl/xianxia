import { EventBus } from '../core/EventBus';
import { PuzzleConfigs, PuzzleLevelConfig } from '../config/PuzzleConfig';
import { TowerCharName } from '../config/GameConfig';

export enum GameMode {
    NORMAL = 'NORMAL',
    PUZZLE = 'PUZZLE'
}

export interface IGameModeStrategy {
    interceptGacha(): boolean;
    canUseShovel(): boolean;
}

export class NormalModeStrategy implements IGameModeStrategy {
    interceptGacha(): boolean {
        return false;
    }

    canUseShovel(): boolean {
        return true;
    }
}

export class PuzzleModeStrategy implements IGameModeStrategy {
    private currentPuzzle: PuzzleLevelConfig | null = null;
    private puzzleInventory: Record<string, { rank: number, count: number }> = {};

    constructor(puzzleId: string) {
        const config = PuzzleConfigs.find(p => p.id === puzzleId);
        if (config) {
            this.currentPuzzle = config;
            this.puzzleInventory = JSON.parse(JSON.stringify(config.inventory));
            console.log(`[GameModeAdapter] 进入解谜模式: ${config.name}`);
            EventBus.emit('puzzle:start', { config: this.currentPuzzle });
        }
    }

    interceptGacha(): boolean {
        console.log(`[GameModeAdapter] 解谜模式限制: 禁止花费灵石随机聚灵！`);
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

    canUseShovel(): boolean {
        if (this.currentPuzzle && this.currentPuzzle.allowedShovels <= 0) {
            console.log(`[GameModeAdapter] 解谜模式限制: 本关卡禁止使用铲子破坏地形！`);
            return false;
        }
        return true;
    }
}

export class GameModeAdapter {
    private static instance: GameModeAdapter;
    private currentMode: GameMode = GameMode.NORMAL;
    private strategy: IGameModeStrategy;

    private constructor() {
        this.strategy = new NormalModeStrategy();
    }

    public static getInstance(): GameModeAdapter {
        if (!GameModeAdapter.instance) {
            GameModeAdapter.instance = new GameModeAdapter();
        }
        return GameModeAdapter.instance;
    }

    public enterPuzzleMode(puzzleId: string) {
        this.currentMode = GameMode.PUZZLE;
        this.strategy = new PuzzleModeStrategy(puzzleId);
    }

    public enterNormalMode() {
        this.currentMode = GameMode.NORMAL;
        this.strategy = new NormalModeStrategy();
        console.log(`[GameModeAdapter] 恢复常规塔防模式`);
    }

    public interceptGacha(): boolean {
        return this.strategy.interceptGacha();
    }

    public canUseShovel(): boolean {
        return this.strategy.canUseShovel();
    }
}
