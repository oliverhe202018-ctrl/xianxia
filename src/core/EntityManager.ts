import { ObjectPool } from '../utils/ObjectPool';
import { Graphics, Container } from 'pixi.js';
import { EnemyEntity, ProjectileEntity, EffectEntity } from '../components';

export class EntityManager {
    public enemies: EnemyEntity[] = [];
    public projectiles: ProjectileEntity[] = [];
    public effects: EffectEntity[] = [];

    private enemyPool: ObjectPool<EnemyEntity>;
    private projectilePool: ObjectPool<ProjectileEntity>;
    private effectPool: ObjectPool<EffectEntity>;
    
    private nextId: number = 1;
    public container: Container;

    constructor() {
        this.container = new Container();
        
        this.enemyPool = new ObjectPool<EnemyEntity>(
            () => this.createEnemyObj(),
            { initialSize: 50, resetFn: (e) => this.resetEntity(e) }
        );

        this.projectilePool = new ObjectPool<ProjectileEntity>(
            () => this.createProjectileObj(),
            { initialSize: 50, resetFn: (p) => this.resetEntity(p) }
        );

        this.effectPool = new ObjectPool<EffectEntity>(
            () => this.createEffectObj(),
            { initialSize: 20, resetFn: (e) => this.resetEntity(e) }
        );
    }

    private createEnemyObj(): EnemyEntity {
        const view = new Graphics();
        return {
            id: this.nextId++,
            active: false,
            transform: { x: 0, y: 0 },
            velocity: { speed: 0 },
            health: { current: 0, max: 0 },
            pathFollower: { waypointIndex: 0 },
            view: view
        };
    }

    private createProjectileObj(): ProjectileEntity {
        const view = new Graphics();
        return {
            id: this.nextId++,
            active: false,
            type: 'sword',
            transform: { x: 0, y: 0 },
            velocity: { speed: 0 },
            damage: 0,
            aoeRadius: 0,
            view: view
        };
    }

    private createEffectObj(): EffectEntity {
        const view = new Graphics();
        return {
            id: this.nextId++,
            active: false,
            transform: { x: 0, y: 0 },
            lifeTime: 0,
            age: 0,
            view: view
        };
    }

    private resetEntity(entity: any): void {
        entity.active = false;
        if (entity.view && entity.view.parent) {
            entity.view.parent.removeChild(entity.view);
        }
        if (entity.view instanceof Graphics) {
            entity.view.clear();
        }
    }

    public spawnEnemy(x: number, y: number, speed: number, hp: number): EnemyEntity {
        const enemy = this.enemyPool.get();
        enemy.active = true;
        enemy.transform.x = x;
        enemy.transform.y = y;
        enemy.velocity.speed = speed;
        enemy.health.current = hp;
        enemy.health.max = hp;
        enemy.pathFollower.waypointIndex = 1;

        if (enemy.view) {
            enemy.view.beginFill(0xFF0000); 
            enemy.view.drawCircle(0, 0, 10);
            enemy.view.endFill();
            
            enemy.view.x = x;
            enemy.view.y = y;
            this.container.addChild(enemy.view);
        }

        this.enemies.push(enemy);
        return enemy;
    }

    public recycleEnemy(enemy: EnemyEntity): void {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) this.enemies.splice(index, 1);
        this.enemyPool.release(enemy);
    }

    public spawnProjectile(type: 'sword' | 'fire', x: number, y: number, targetId: number | undefined, targetPos: {x:number,y:number}|undefined, speed: number, damage: number, aoeRadius: number): ProjectileEntity {
        const p = this.projectilePool.get();
        p.active = true;
        p.type = type;
        p.transform.x = x;
        p.transform.y = y;
        p.targetId = targetId;
        p.targetPos = targetPos;
        p.velocity.speed = speed;
        p.damage = damage;
        p.aoeRadius = aoeRadius;

        if (p.view) {
            if (type === 'sword') {
                p.view.beginFill(0x00FFFF); // 剑：蓝色
                p.view.drawRect(-2, -8, 4, 16);
            } else {
                p.view.beginFill(0xFF4500); // 火：红色
                p.view.drawCircle(0, 0, 6);
            }
            p.view.endFill();
            p.view.x = x;
            p.view.y = y;
            this.container.addChild(p.view);
        }

        this.projectiles.push(p);
        return p;
    }

    public recycleProjectile(p: ProjectileEntity): void {
        const index = this.projectiles.indexOf(p);
        if (index !== -1) this.projectiles.splice(index, 1);
        this.projectilePool.release(p);
    }

    public spawnEffect(x: number, y: number, type: 'explosion' | 'death', radius: number = 40): EffectEntity {
        const effect = this.effectPool.get();
        effect.active = true;
        effect.transform.x = x;
        effect.transform.y = y;
        effect.age = 0;
        
        if (type === 'explosion') {
            effect.lifeTime = 300; 
            if (effect.view) {
                effect.view.lineStyle(2, 0xFF0000, 0.8);
                effect.view.beginFill(0xFF0000, 0.3);
                effect.view.drawCircle(0, 0, radius); 
                effect.view.endFill();
            }
        } else {
            effect.lifeTime = 200; 
            if (effect.view) {
                effect.view.beginFill(0xCCCCCC);
                effect.view.drawCircle(0, 0, 8);
                effect.view.endFill();
            }
        }

        if (effect.view) {
            effect.view.x = x;
            effect.view.y = y;
            effect.view.alpha = 1;
            this.container.addChild(effect.view);
        }

        this.effects.push(effect);
        return effect;
    }

    public recycleEffect(effect: EffectEntity): void {
        const index = this.effects.indexOf(effect);
        if (index !== -1) this.effects.splice(index, 1);
        this.effectPool.release(effect);
    }
}
