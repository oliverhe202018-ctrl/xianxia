import { EntityManager } from '../core/EntityManager';
import { GameState } from '../core/GameState';

export class MovementSystem {
    private waypoints: { x: number, y: number }[];

    constructor(private entityManager: EntityManager, waypoints: { x: number, y: number }[]) {
        this.waypoints = waypoints;
    }

    public setWaypoints(waypoints: { x: number, y: number }[]) {
        this.waypoints = waypoints;
    }

    /**
     * @param delta 帧率系数 (Pixi Ticker 提供)
     */
    public update(delta: number): void {
        const { enemies } = this.entityManager;
        
        // 倒序遍历，确保在遍历过程中调用 recycleEnemy 修改数组时不会导致索引错乱
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (!enemy.active) continue;

            const targetIndex = enemy.pathFollower.waypointIndex;
            // 判断是否到达终点
            if (targetIndex >= this.waypoints.length) {
                // 根据敌人血量上限或其他属性判断类型，这里简单用血量上限区分
                let damage = 1;
                if (enemy.health.max >= 500) damage = 10; // Boss
                else if (enemy.health.max >= 200) damage = 5; // Elite

                GameState.getInstance().deductHealth(damage);
                this.entityManager.spawnTextEffect(enemy.transform.x, enemy.transform.y, `-${damage} 生命`);

                this.entityManager.recycleEnemy(enemy);
                continue;
            }

            const target = this.waypoints[targetIndex];
            const dx = target.x - enemy.transform.x;
            const dy = target.y - enemy.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 基础移速，使用线性数学插值进行计算
            const moveStep = enemy.velocity.speed * delta;

            if (dist <= moveStep) {
                // 已到达或超过目标航点
                enemy.transform.x = target.x;
                enemy.transform.y = target.y;
                enemy.pathFollower.waypointIndex++;
            } else {
                // 匀速向目标航点移动
                const ratio = moveStep / dist;
                enemy.transform.x += dx * ratio;
                enemy.transform.y += dy * ratio;
            }

            // 更新渲染组件位置
            if (enemy.view) {
                enemy.view.x = enemy.transform.x;
                enemy.view.y = enemy.transform.y;
            }

        }

        // --- 修复点: 每帧末尾全量重构 SpatialHash 确保绝对同步 ---
        this.entityManager.spatialHash.clear();
        for (const enemy of enemies) {
            if (enemy.active) {
                this.entityManager.spatialHash.insert(enemy as any);
            }
        }
    }
}
