import { GameConfig, TowerCharName } from '../config/GameConfig';

export interface CombatStats {
    attack: number;
    range: number;
    attackSpeed: number;
}

export const StatsCenter = {
    compute: (charName: TowerCharName, rank: number): CombatStats => {
        const base = GameConfig.Towers.baseStats[charName];
        const growth = GameConfig.Towers.growthMultipliers;

        // 指数级成长：base * (multiplier ^ (rank - 1))
        return {
            attack: base.attack * Math.pow(growth.attack, rank - 1),
            range: base.range * Math.pow(growth.range, rank - 1),
            attackSpeed: base.attackSpeed * Math.pow(growth.attackSpeed, rank - 1)
        };
    }
};
