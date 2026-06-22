import { EntityManager } from './EntityManager';

export class WaveManager {
    private timeSinceLastSpawn: number = 0;
    private spawnInterval: number = 500; // 0.5 秒
    private waypoints: { x: number, y: number }[];
    
    public currentLevel: number = 1;
    public spawnedInLevel: number = 0;
    private enemiesPerLevel: number = 10;
    private levelCooldown: number = 0;

    constructor(private entityManager: EntityManager, waypoints: { x: number, y: number }[]) {
        this.waypoints = waypoints;
    }

    public setWaypoints(waypoints: { x: number, y: number }[]) {
        this.waypoints = waypoints;
    }

    public reset() {
        this.currentLevel = 1;
        this.spawnedInLevel = 0;
        this.levelCooldown = 0;
        this.timeSinceLastSpawn = 0;
    }

    /**
     * @param deltaMS 距上一帧的真实毫秒时间间隔
     */
    public update(deltaMS: number): void {
        if (this.waypoints.length === 0) return;

        if (this.levelCooldown > 0) {
            this.levelCooldown -= deltaMS;
            if (this.levelCooldown <= 0) {
                this.currentLevel++;
                this.spawnedInLevel = 0;
                this.entityManager.spawnTextEffect(400, 300, `第 ${this.currentLevel} 波开始!`);
                // 需要引入 EventBus, 这里直接用全局
                require('./EventBus').EventBus.emit('level:start', { level: this.currentLevel });
            }
            return;
        }

        this.timeSinceLastSpawn += deltaMS;
        
        if (this.timeSinceLastSpawn >= this.spawnInterval) {
            this.timeSinceLastSpawn -= this.spawnInterval;
            
            const startPoint = this.waypoints[0];
            
            // 基础属性随关卡提升
            let speed = 1.5 + (this.currentLevel * 0.1);
            let hp = 80 + (this.currentLevel * 20);
            
            this.spawnedInLevel++;
            let isLastEnemy = this.spawnedInLevel >= this.enemiesPerLevel;
            
            // 检查是否为精英或Boss关卡的最后一怪
            if (isLastEnemy) {
                if (this.currentLevel % 10 === 0) {
                    // Boss
                    hp = hp * 10;
                    speed = speed * 0.5; // 慢速巨肉
                    this.entityManager.spawnEnemy(startPoint.x, startPoint.y, speed, hp, 0xFF00FF, 40);
                } else if (this.currentLevel % 5 === 0) {
                    // Elite
                    hp = hp * 5;
                    speed = speed * 0.8;
                    this.entityManager.spawnEnemy(startPoint.x, startPoint.y, speed, hp, 0xFFA500, 30);
                } else {
                    // Normal
                    this.entityManager.spawnEnemy(startPoint.x, startPoint.y, speed, hp);
                }
                
                // 本关卡结束，进入 3秒 冷却
                this.levelCooldown = 3000;
            } else {
                this.entityManager.spawnEnemy(startPoint.x, startPoint.y, speed, hp);
            }
        }
    }
}
