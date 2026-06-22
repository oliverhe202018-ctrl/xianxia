export interface WaveData {
    enemyType: string;
    spawnInterval: number; // 毫秒
    count: number; // 本波怪物总量
    hp: number;
    speed: number;
}

export interface LevelConfig {
    levelIndex: number;
    mapIndex: number;
    baseHp: number;
    baseSpeed: number;
    baseWaveCount: number;
    waves: WaveData[];
}

export class LevelManager {
    private currentLevelIndex: number = 1;
    public readonly maxLevel: number = 30;

    // ── 事件总线与生命周期钩子 ──
    public onLevelCleared?: (level: number) => void;
    public onLevelFailed?: (level: number) => void;
    public onLevelLoaded?: (config: LevelConfig) => void;

    // ── 基础常量 ──
    private readonly INITIAL_HP = 100;
    private readonly INITIAL_SPEED = 2;
    private readonly INITIAL_WAVES = 3;
    private readonly MAX_SPEED = 8; // 速度上限，防止怪物移动过快穿模

    constructor() {}

    /**
     * 1. 难度膨胀算法：基于纯数学函数的非线性增长曲线
     * @param levelIndex 当前关卡数 (1-30)
     */
    public calculateDifficulty(levelIndex: number) {
        // 血量：呈 1.15^N 指数增长
        const hpMultiplier = Math.pow(1.15, levelIndex - 1);
        const hp = Math.floor(this.INITIAL_HP * hpMultiplier);

        // 移速：呈对数增长 (Logarithmic growth)，后期增长放缓并设死上限
        // ln(levelIndex) 在 level 30 时约为 3.4
        const speedGrowth = Math.log(levelIndex) * 1.5;
        const speed = Math.min(this.INITIAL_SPEED + speedGrowth, this.MAX_SPEED);

        // 波次数：每 5 关增加 1 波
        const extraWaves = Math.floor((levelIndex - 1) / 5);
        const waveCount = this.INITIAL_WAVES + extraWaves;

        return { hp, speed, waveCount };
    }

    /**
     * 2. 波次生成器：取消硬编码，自动生成动态关卡波次
     */
    private generateWaves(difficulty: { hp: number, speed: number, waveCount: number }): WaveData[] {
        const waves: WaveData[] = [];
        
        for (let w = 0; w < difficulty.waveCount; w++) {
            // 单波总量随波次递增
            const count = 10 + w * 2; 
            
            // 怪物生成间隔随波次缩短，带来紧迫感，最低限制为 300ms
            const spawnInterval = Math.max(300, 1000 - w * 100);

            // 最后一波作为“Boss/精英波”，血量上浮 50%
            const isBossWave = (w === difficulty.waveCount - 1);
            const waveHp = isBossWave ? Math.floor(difficulty.hp * 1.5) : difficulty.hp;
            
            waves.push({
                enemyType: isBossWave ? 'elite' : 'normal',
                spawnInterval,
                count,
                hp: waveHp,
                speed: difficulty.speed
            });
        }
        return waves;
    }

    /**
     * 3. 关卡调度器核心：加载指定的 LevelConfig
     */
    public loadLevel(levelIndex: number): LevelConfig {
        this.currentLevelIndex = Math.min(Math.max(1, levelIndex), this.maxLevel);
        
        const difficulty = this.calculateDifficulty(this.currentLevelIndex);
        const waves = this.generateWaves(difficulty);

        const config: LevelConfig = {
            levelIndex: this.currentLevelIndex,
            mapIndex: 1, // 当前仅实现地图 1，留作扩展
            baseHp: difficulty.hp,
            baseSpeed: difficulty.speed,
            baseWaveCount: difficulty.waveCount,
            waves: waves
        };

        // 触发加载事件，通知游戏循环与 UI 渲染
        if (this.onLevelLoaded) {
            this.onLevelLoaded(config);
        }

        return config;
    }

    /**
     * 关卡调度器：处理胜利结算
     */
    public levelClear(): void {
        console.log(`[LevelManager] Level ${this.currentLevelIndex} Cleared!`);
        
        if (this.onLevelCleared) {
            this.onLevelCleared(this.currentLevelIndex);
        }
        // UI 可在此处监听事件并显示结算面板与“下一关”按钮
    }

    /**
     * 关卡调度器：处理失败结算
     */
    public levelFail(): void {
        console.log(`[LevelManager] Level ${this.currentLevelIndex} Failed!`);
        
        if (this.onLevelFailed) {
            this.onLevelFailed(this.currentLevelIndex);
        }
        // UI 可在此处监听事件并显示重新挑战面板
    }

    /**
     * 关卡调度器：外部暴露的“下一关”入口
     */
    public nextLevel(): void {
        if (this.currentLevelIndex < this.maxLevel) {
            this.loadLevel(this.currentLevelIndex + 1);
        } else {
            console.log(`[LevelManager] All ${this.maxLevel} levels cleared! Congratulations!`);
        }
    }
}
