import { EntityManager } from './EntityManager';

export class WaveManager {
    private timeSinceLastSpawn: number = 0;
    private spawnInterval: number = 500; // 0.5 秒 (500毫秒)
    private waypoints: { x: number, y: number }[];

    constructor(private entityManager: EntityManager, waypoints: { x: number, y: number }[]) {
        this.waypoints = waypoints;
    }

    /**
     * @param deltaMS 距上一帧的真实毫秒时间间隔
     */
    public update(deltaMS: number): void {
        if (this.waypoints.length === 0) return;

        this.timeSinceLastSpawn += deltaMS;
        
        // 测试对象池: 每0.5秒在起点生成一个敌人实体
        if (this.timeSinceLastSpawn >= this.spawnInterval) {
            this.timeSinceLastSpawn -= this.spawnInterval;
            
            const startPoint = this.waypoints[0];
            // 赋予基础移速 2，血量 100
            this.entityManager.spawnEnemy(startPoint.x, startPoint.y, 2, 100);
        }
    }
}
