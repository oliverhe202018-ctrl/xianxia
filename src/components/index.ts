export interface Transform {
    x: number;
    y: number;
}
import { BossStateMachine } from './BossStateMachine';

export interface Velocity {
    speed: number;
}

export interface Health {
    current: number;
    max: number;
}

export interface PathFollower {
    waypointIndex: number;
}

export interface EnemyEntity {
    id: number;
    active: boolean;
    transform: Transform;
    velocity: Velocity;
    health: Health;
    pathFollower: PathFollower;
    view?: any;
    fsm?: BossStateMachine;
}

export interface TowerEntity {
    id: number;
    charName: string;
    rank: number;
    isDeployed: boolean;
    gridX: number;
    gridY: number;
    slotIndex: number;
    view: any;
    
    // Combat fields
    targetId?: number;
    lastAttackTime: number;
    combatStats?: {
        attack: number;
        range: number;
        attackSpeed: number;
    };
}

export interface ProjectileEntity {
    id: number;
    active: boolean;
    type: 'sword' | 'fire';
    transform: Transform;
    velocity: Velocity;
    targetId?: number;
    targetPos?: { x: number, y: number };
    damage: number;
    aoeRadius: number; // 0 for single target
    view?: any;
}

export interface EffectEntity {
    id: number;
    active: boolean;
    transform: Transform;
    lifeTime: number; // ms
    age: number; // ms
    view?: any;
}
