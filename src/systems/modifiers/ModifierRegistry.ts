import { AttackContext, IRuneStrategy } from '../../types/Rune';

export class AddProjectileStrategy implements IRuneStrategy {
    public onBeforeFire(context: AttackContext, runeValue: number): void {
        context.projectileCount += runeValue;
        
        // 只有产生多重弹道时，才赋予一个基础散布角度，比如 15度 (PI/12)
        if (context.projectileSpreadAngle === 0 && context.projectileCount > 1) {
            context.projectileSpreadAngle = Math.PI / 12; 
        }
    }
}

export class AddAoeRadiusStrategy implements IRuneStrategy {
    public onBeforeFire(context: AttackContext, runeValue: number): void {
        context.aoeRadius += runeValue;
    }
}

export class ModifierRegistry {
    private static strategies: Map<string, IRuneStrategy> = new Map();

    // 静态初始化块，集中注册所有支持的词条
    static {
        ModifierRegistry.strategies.set('ADD_PROJECTILE', new AddProjectileStrategy());
        ModifierRegistry.strategies.set('ADD_AOE_RADIUS', new AddAoeRadiusStrategy());
        // 后续可随时无痛扩展新词条...
    }

    public static getStrategy(type: string): IRuneStrategy | undefined {
        return this.strategies.get(type);
    }
}
