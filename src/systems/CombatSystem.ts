import { EntityManager } from '../core/EntityManager';
import { TowerManager } from '../core/TowerManager';
import { GameState } from '../core/GameState';
import { GameConfig } from '../config/GameConfig';
import { UserStore } from '../store/UserStore';
import { EventBus } from '../core/EventBus'; // 引入用户仓库
import { EquipmentStore } from '../store/EquipmentStore'; // 引入装备库
import { AttackContext } from '../types/Rune';
import { ModifierRegistry } from './modifiers/ModifierRegistry';

export class CombatSystem {
    private gameTime: number = 0;

    constructor(
        private towerManager: TowerManager,
        private entityManager: EntityManager
    ) {}

    public update(deltaMS: number, delta: number): void {
        this.gameTime += deltaMS;

        const towers = this.towerManager.getDeployedTowers();
        const enemies = this.entityManager.enemies.filter(e => e.active);
        const { projectiles, effects } = this.entityManager;

        // 1. 防御塔开火逻辑
        for (const tower of towers) {
            if (tower.targetId !== undefined) {
                const target = this.entityManager.enemyMap.get(tower.targetId);
                if (target) {
                    const baseStats = GameConfig.Towers.baseStats[tower.charName as keyof typeof GameConfig.Towers.baseStats];
                    let baseDamage = baseStats ? baseStats.attack * Math.pow(GameConfig.Towers.growthMultipliers.attack, tower.rank - 1) : 10;
                    let attackSpeed = baseStats ? baseStats.attackSpeed * Math.pow(GameConfig.Towers.growthMultipliers.attackSpeed, tower.rank - 1) : 1;
                    let attackInterval = 1000 / attackSpeed;
                    
                    let speed = 5 + tower.rank;
                    let aoeRadius = 0;
                    let type: 'sword' | 'fire' = 'sword';

                    if (tower.charName === '火') {
                        aoeRadius = 40 + tower.rank * 10;
                        type = 'fire';
                    }

                    // 读取局外养成属性，计算基础实际伤害
                    const attackBuff = UserStore.getInstance().getAttackBuffMultiplier();
                    const actualDamage = baseDamage * (1 + attackBuff);

                    if (tower.lastAttackTime + attackInterval <= this.gameTime) {
                        tower.lastAttackTime = this.gameTime;
                        
                        // --- 核心：构建并下发 AttackContext ---
                        const attackContext: AttackContext = {
                            towerId: tower.id,
                            targetId: target.id,
                            type: type,
                            speed: speed,
                            damage: actualDamage,
                            aoeRadius: aoeRadius,
                            projectileCount: 1, // 默认单发
                            projectileSpreadAngle: 0 
                        };

                        // 获取该塔装备的专属法印
                        const runes = EquipmentStore.getInstance().getRunesForWord(tower.charName);
                        
                        // 【策略模式】遍历执行法印的拦截钩子，修改上下文
                        for (const rune of runes) {
                            const strategy = ModifierRegistry.getStrategy(rune.modifier_type);
                            if (strategy && strategy.onBeforeFire) {
                                strategy.onBeforeFire(attackContext, rune.value);
                            }
                        }

                        // 根据最终篡改后的上下文，执行真正的发射逻辑
                        for (let p = 0; p < attackContext.projectileCount; p++) {
                            let spreadX = 0;
                            let spreadY = 0;

                            // 简易散布计算：如果多发，使其呈一定扇面偏移散开
                            if (attackContext.projectileCount > 1) {
                                const offsetMagnitude = (p - (attackContext.projectileCount - 1) / 2) * 30; // 每发偏移 30 像素
                                const dx = target.transform.x - tower.view.x;
                                const dy = target.transform.y - tower.view.y;
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if (dist > 0) {
                                    // 沿法线方向散布
                                    const normalX = -dy / dist;
                                    const normalY = dx / dist;
                                    spreadX = normalX * offsetMagnitude;
                                    spreadY = normalY * offsetMagnitude;
                                }
                            }

                            const finalTargetPos = { 
                                x: target.transform.x + spreadX, 
                                y: target.transform.y + spreadY 
                            };

                            this.entityManager.spawnProjectile(
                                attackContext.type,
                                tower.view.x,
                                tower.view.y,
                                target.id,
                                finalTargetPos,
                                attackContext.speed,
                                attackContext.damage, 
                                attackContext.aoeRadius // 这里可能已经被 AddAoeRadiusStrategy 扩大了
                            );
                        }
                    }
                } else {
                    tower.targetId = undefined; // 目标已死或丢失
                }
            }
        }

        // 2. 弹射物飞行与碰撞检测
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (!p.active) continue;

            let targetX = p.transform.x;
            let targetY = p.transform.y;
            let hit = false;
            let targetEnemy = p.targetId !== undefined ? this.entityManager.enemyMap.get(p.targetId) : undefined;

            if (p.type === 'sword') {
                if (!targetEnemy && !p.targetPos) { 
                    this.entityManager.recycleProjectile(p);
                    continue;
                }
                if (targetEnemy) {
                    targetX = targetEnemy.transform.x;
                    targetY = targetEnemy.transform.y;
                } else {
                    targetX = p.targetPos!.x;
                    targetY = p.targetPos!.y;
                }
            } else {
                if (targetEnemy) { 
                    targetX = targetEnemy.transform.x;
                    targetY = targetEnemy.transform.y;
                    p.targetPos = { x: targetX, y: targetY };
                } else if (p.targetPos) {
                    targetX = p.targetPos.x;
                    targetY = p.targetPos.y;
                }
            }

            const dx = targetX - p.transform.x;
            const dy = targetY - p.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const moveStep = p.velocity.speed * delta;

            if (dist <= moveStep || dist < 15) {
                hit = true;
            } else {
                const ratio = moveStep / dist;
                p.transform.x += dx * ratio;
                p.transform.y += dy * ratio;

                if (p.view) {
                    p.view.x = p.transform.x;
                    p.view.y = p.transform.y;
                    
                    if (p.type === 'sword') {
                        p.view.rotation = Math.atan2(dy, dx) + Math.PI / 2;
                    }
                }
            }

            // 3. 命中结算
            if (hit) {
                // 如果需要支持 onHit 策略，也可以在这里调用，目前先维持原有伤害结算
                if (p.type === 'sword') {
                    if (targetEnemy) {
                        this.damageEnemy(targetEnemy, p.damage);
                    }
                } else if (p.type === 'fire') {
                    this.entityManager.spawnEffect(p.transform.x, p.transform.y, 'explosion', p.aoeRadius);
                    
                    const nearbyEnemies = this.entityManager.spatialHash.queryRange(
                        p.transform.x, 
                        p.transform.y, 
                        p.aoeRadius
                    );

                    for (const entity of nearbyEnemies) {
                        const enemy = entity as any;
                        if (enemy.active) {
                            this.damageEnemy(enemy, p.damage);
                        }
                    }
                }
                this.entityManager.recycleProjectile(p);
            }
        }

        // 4. 短暂特效更新
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i];
            effect.age += deltaMS;
            if (effect.age >= effect.lifeTime) {
                this.entityManager.recycleEffect(effect);
            } else {
                if (effect.view) { 
                    effect.view.alpha = 1 - (effect.age / effect.lifeTime);
                }
            }
        }

        // 5. 文字特效更新
        for (let i = this.entityManager.textEffects.length - 1; i >= 0; i--) {
            const te = this.entityManager.textEffects[i];
            te.age += deltaMS;
            if (te.age >= te.lifeTime) {
                this.entityManager.recycleTextEffect(te);
            } else {
                const ratio = te.age / te.lifeTime;
                te.view.alpha = 1 - ratio;
                te.view.y -= 0.5 * delta; // 向上飘动
            }
        }
    }

    private damageEnemy(enemy: any, amount: number) {
        if (!enemy.active) return; 

        const previousHealth = enemy.health.current;
        enemy.health.current -= amount;
        
        // FSM 状态流转检测 (Boss 跨越血量阈值触发转阶段)
        if (enemy.fsm) {
            const healthRatio = enemy.health.current / enemy.health.max;
            if (previousHealth / enemy.health.max > 0.5 && healthRatio <= 0.5) {
                enemy.fsm.transitionTo('phase2');
                EventBus.emit('boss:phase_change', { enemyId: enemy.id, phase: 'phase2' });
            }
        }

        if (enemy.health.current <= 0) {
            enemy.active = false;
            EventBus.emit('combat:kill', { enemyId: enemy.id });
            this.entityManager.spawnEffect(enemy.transform.x, enemy.transform.y, 'death');
            
            const isVip = UserStore.getInstance().getIsVip();
            const baseStones = 5;
            const finalStones = isVip ? Math.ceil(baseStones * 1.3) : baseStones;
            
            GameState.getInstance().addStones(finalStones);
            this.entityManager.spawnTextEffect(enemy.transform.x, enemy.transform.y, `+${finalStones} 灵石`);
            
            this.entityManager.recycleEnemy(enemy);
        }
    }
}
