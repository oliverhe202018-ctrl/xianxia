import { ObjectPool } from '../utils/ObjectPool';
import { Container, ParticleContainer, Sprite, Texture, Graphics, Text } from 'pixi.js';
import { EnemyEntity, ProjectileEntity, EffectEntity } from '../components';
import { SpatialHash } from '../utils/SpatialHash';

export class EntityManager {
    public enemies: EnemyEntity[] = [];
    public enemyMap: Map<number, EnemyEntity> = new Map();
    public projectiles: ProjectileEntity[] = [];
    public effects: EffectEntity[] = [];

    private enemyPool: ObjectPool<EnemyEntity>;
    private projectilePool: ObjectPool<ProjectileEntity>;
    private effectPool: ObjectPool<EffectEntity>;
    public textEffects: { view: Text, age: number, lifeTime: number, active: boolean }[] = [];
    private textEffectPool: ObjectPool<{ view: Text, age: number, lifeTime: number, active: boolean }>;
    
    private nextId: number = 1;
    public container: Container;
    public particleContainer: ParticleContainer;
    public spatialHash: SpatialHash;

    constructor() {
        this.container = new Container();
        
        // 【核心】开启对 position, rotation, tint 的批量同步
        this.particleContainer = new ParticleContainer(2000, {
            position: true,
            rotation: true,
            tint: true,
            uvs: false,
            vertices: false
        });
        this.container.addChild(this.particleContainer);

        this.spatialHash = new SpatialHash(50); // 50 pixels per cell
        
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

        this.textEffectPool = new ObjectPool<{ view: Text, age: number, lifeTime: number, active: boolean }>(
            () => this.createTextEffectObj(),
            { initialSize: 20, resetFn: (te) => {
                te.active = false;
                te.view.text = '';
                if (te.view.parent) {
                    te.view.parent.removeChild(te.view);
                }
            }}
        );
    }

    public reset() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.recycleEnemy(this.enemies[i]);
        }
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.recycleProjectile(this.projectiles[i]);
        }
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.recycleEffect(this.effects[i]);
        }
        for (const te of this.textEffects) {
            if (te.view && te.view.parent) {
                te.view.parent.removeChild(te.view);
            }
        }
        this.textEffects = [];
    }

    private createEnemyObj(): EnemyEntity {
        // 【降级】彻底弃用 Graphics，改用基于内部预设纹理的轻量 Sprite
        const view = new Sprite(Texture.WHITE);
        view.anchor.set(0.5);
        view.width = 20;
        view.height = 20;
        
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
        const view = new Sprite(Texture.WHITE);
        view.anchor.set(0.5);

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

    private createTextEffectObj(): { view: Text, age: number, lifeTime: number, active: boolean } {
        const text = new Text('', {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0x00FFFF,
            fontWeight: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        text.anchor.set(0.5);
        return {
            view: text,
            age: 0,
            lifeTime: 800,
            active: false
        };
    }

    private resetEntity(entity: any): void {
        entity.active = false;
        
        if (entity.view) {
            // 1. 从物理渲染树中剥离
            if (entity.view.parent) {
                entity.view.parent.removeChild(entity.view);
            }
            
            // 2. 针对遗留 Graphics 的处理
            if (typeof entity.view.clear === 'function') {
                entity.view.clear();
            }

            // 3. 针对 Sprite 的纹理引用断开 (防止内存泄漏)
            if (entity.view instanceof Sprite) {
                entity.view.texture = Texture.EMPTY; 
                entity.view.rotation = 0;
                entity.view.scale.set(1);
            }
        }
    }

    public spawnEnemy(x: number, y: number, speed: number, hp: number, tint: number = 0xFF0000, size: number = 20): EnemyEntity {
        const enemy = this.enemyPool.get();
        enemy.active = true;
        enemy.transform.x = x;
        enemy.transform.y = y;
        enemy.velocity.speed = speed;
        enemy.health.current = hp;
        enemy.health.max = hp;
        enemy.pathFollower.waypointIndex = 1;

        if (enemy.view) {
            enemy.view.texture = Texture.WHITE;
            enemy.view.tint = tint;
            enemy.view.width = size;
            enemy.view.height = size;
            
            enemy.view.x = x;
            enemy.view.y = y;
            // 放入极速渲染容器
            this.particleContainer.addChild(enemy.view);
        }

        this.enemies.push(enemy);
        this.enemyMap.set(enemy.id, enemy);
        this.spatialHash.insert(enemy as any);
        return enemy;
    }

    public recycleEnemy(enemy: EnemyEntity): void {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
        this.enemyMap.delete(enemy.id);
        this.spatialHash.remove(enemy as any);
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
            p.view.texture = Texture.WHITE;
            if (type === 'sword') {
                p.view.tint = 0x00FFFF; // 剑：蓝色
                p.view.width = 4;
                p.view.height = 16;
            } else {
                p.view.tint = 0xFF4500; // 火：红色
                p.view.width = 12;
                p.view.height = 12;
            }
            p.view.x = x;
            p.view.y = y;
            // 放入极速渲染容器
            this.particleContainer.addChild(p.view);
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

    public spawnTextEffect(x: number, y: number, textStr: string): void {
        const te = this.textEffectPool.get();
        te.active = true;
        te.age = 0;
        te.lifeTime = 800;
        te.view.text = textStr;
        te.view.x = x;
        te.view.y = y;
        this.container.addChild(te.view);
        
        this.textEffects.push(te);
    }

    public recycleTextEffect(te: { view: Text, age: number, lifeTime: number, active: boolean }): void {
        const index = this.textEffects.indexOf(te);
        if (index !== -1) {
            this.textEffects.splice(index, 1);
        }
        this.textEffectPool.release(te);
    }
}
