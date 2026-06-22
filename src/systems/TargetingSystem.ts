import { TowerManager } from '../core/TowerManager';
import { EntityManager } from '../core/EntityManager';
import { EnemyEntity } from '../components';

export class TargetingSystem {
    constructor(
        private towerManager: TowerManager,
        private entityManager: EntityManager
    ) {}

    public update(): void {
        const towers = this.towerManager.getDeployedTowers();
        const enemies = this.entityManager.enemies.filter(e => e.active);

        for (const tower of towers) {
            // 根据不同塔和阶级决定攻击范围
            let radius = 100;
            if (tower.charName === '剑') {
                radius = 120 + tower.rank * 10;
            } else if (tower.charName === '火') {
                radius = 150 + tower.rank * 15;
            }

            let bestTarget: EnemyEntity | null = null;
            let highestWaypoint = -1;

            const nearbyEnemies = this.entityManager.spatialHash.queryRange(tower.view.x, tower.view.y, radius);

            for (const entity of nearbyEnemies) {
                const enemy = entity as EnemyEntity;
                if (!enemy.active) continue;

                const wpIndex = enemy.pathFollower.waypointIndex;
                    
                    // 优先级 1：寻路点索引最大（最接近终点）
                    if (wpIndex > highestWaypoint) {
                        highestWaypoint = wpIndex;
                        bestTarget = enemy;
                    } else if (wpIndex === highestWaypoint) {
                        // 优先级 2：距离防御塔更近的敌人
                        if (bestTarget) {
                            const b_dx = bestTarget.transform.x - tower.view.x;
                            const b_dy = bestTarget.transform.y - tower.view.y;
                            const b_distSq = b_dx * b_dx + b_dy * b_dy;
                            if (distSq < b_distSq) {
                                bestTarget = enemy;
                            }
                        }
                    }
                }
            }

            if (bestTarget) {
                tower.targetId = bestTarget.id;
            } else {
                tower.targetId = undefined;
            }
        }
    }
}
