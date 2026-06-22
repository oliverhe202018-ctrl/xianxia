export interface Rune {
    id: string;
    target_word: string; // 适用的汉字，如"剑"、"火"
    modifier_type: string; // 词条类型，如 'ADD_PROJECTILE', 'ADD_AOE_RADIUS'
    value: number; // 数值
}

// 攻击上下文，包含了本次开火的基础属性。法印策略会拦截并修改这个上下文。
export interface AttackContext {
    towerId: number;
    targetId?: number;
    
    type: 'sword' | 'fire';
    speed: number;
    damage: number;
    aoeRadius: number;
    
    // 以下为法印系统可扩展出来的修饰属性
    projectileCount: number; // 发射弹道数量
    projectileSpreadAngle: number; // 多重弹道的散布弧度
    chainCount?: number; // 闪电链/弹射次数 (若未来扩展)
}

// 词条策略接口
export interface IRuneStrategy {
    /**
     * 在生成子弹前拦截
     * @param context 当前开火上下文
     * @param runeValue 该词条的数值
     */
    onBeforeFire?(context: AttackContext, runeValue: number): void;
    
    /**
     * 在子弹命中目标时拦截（预留接口扩展）
     */
    onHit?(context: AttackContext, runeValue: number, targetEnemy: any): void;
}
