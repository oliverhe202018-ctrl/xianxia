export const GameConfig = {
    Gacha: {
        cost: 10,
        pityThreshold: 50,
        weights: {
            1: 70, // 1阶权重
            2: 20, // 2阶权重
            3: 8,  // 3阶权重
            4: 2   // 4阶权重
        },
        vipBonusMultipliers: {
            3: 1.2,
            4: 1.2
        }
    },
    Towers: {
        // 使用 charName 作为键
        baseStats: {
            '剑': { attack: 10, range: 2, attackSpeed: 1.0 },
            '火': { attack: 15, range: 2.5, attackSpeed: 0.8 },
            '水': { attack: 8, range: 3, attackSpeed: 1.2 },
            '雷': { attack: 25, range: 4, attackSpeed: 0.5 },
            '风': { attack: 12, range: 2, attackSpeed: 1.5 }
        },
        growthMultipliers: {
            attack: 1.5,
            range: 1.1,
            attackSpeed: 1.05
        }
    },
    Tiles: {
        EMPTY: 0,
        ROAD: 1,
        SPAWN: 2,
        BASE: 3,
        TOWER_SLOT: 4
    }
} as const;

export type TowerCharName = keyof typeof GameConfig.Towers.baseStats;
export type TileType = typeof GameConfig.Tiles[keyof typeof GameConfig.Tiles];
