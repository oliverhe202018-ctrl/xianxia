export interface PuzzleLevelConfig {
    id: string;
    name: string;
    desc: string;
    inventory: Record<string, { rank: number, count: number }>;
    enemyWave: {
        hp: number;
        speed: number;
        count: number;
        interval: number;
        tint: number;
    };
    allowedShovels: number;
}

export const PuzzleConfigs: PuzzleLevelConfig[] = [
    {
        id: 'puzzle_1',
        name: '极寒天火阵',
        desc: '残局：你只有一座3阶冰塔和一座3阶火塔，无法聚灵。利用减速与AOE的完美配合，阻挡高护甲快移速的精英怪群！',
        inventory: {
            'ice': { rank: 3, count: 1 },
            'fire': { rank: 3, count: 1 }
        },
        enemyWave: {
            hp: 8000,
            speed: 120, // 极快
            count: 20,
            interval: 500,
            tint: 0x8800ff // 紫色精英
        },
        allowedShovels: 0 // 禁用铲子
    }
];
