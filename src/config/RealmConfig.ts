export interface RealmLevelConfig {
    id: number;
    name: string;
    baseRequiredExp: number;          // 1层的基准经验
    expMultiplierPerSubLevel: number; // 每层经验递增倍率
    damageMultiplierPerSubLevel: number; // 每小层增加的伤害系数（如 0.05 代表 5%）
    breakthroughDamageBoost: number;  // 大境界突破时的额外系数（如 0.5 代表 50%）
    requiredPills: number;            // 突破所需渡劫丹数量
    baseSuccessRate: number;          // 基础突破成功率 (0-1)
}

// 10大境界配置
export const REALMS: RealmLevelConfig[] = [
    { id: 1, name: '练气', baseRequiredExp: 100, expMultiplierPerSubLevel: 1.2, damageMultiplierPerSubLevel: 0.05, breakthroughDamageBoost: 0.5, requiredPills: 1, baseSuccessRate: 0.9 },
    { id: 2, name: '筑基', baseRequiredExp: 1000, expMultiplierPerSubLevel: 1.3, damageMultiplierPerSubLevel: 0.06, breakthroughDamageBoost: 0.6, requiredPills: 3, baseSuccessRate: 0.7 },
    { id: 3, name: '结丹', baseRequiredExp: 5000, expMultiplierPerSubLevel: 1.4, damageMultiplierPerSubLevel: 0.07, breakthroughDamageBoost: 0.8, requiredPills: 10, baseSuccessRate: 0.5 },
    { id: 4, name: '元婴', baseRequiredExp: 20000, expMultiplierPerSubLevel: 1.5, damageMultiplierPerSubLevel: 0.08, breakthroughDamageBoost: 1.0, requiredPills: 20, baseSuccessRate: 0.3 },
    { id: 5, name: '化神', baseRequiredExp: 100000, expMultiplierPerSubLevel: 1.6, damageMultiplierPerSubLevel: 0.09, breakthroughDamageBoost: 1.5, requiredPills: 50, baseSuccessRate: 0.15 },
    { id: 6, name: '炼虚', baseRequiredExp: 500000, expMultiplierPerSubLevel: 1.7, damageMultiplierPerSubLevel: 0.10, breakthroughDamageBoost: 2.0, requiredPills: 100, baseSuccessRate: 0.08 },
    { id: 7, name: '合体', baseRequiredExp: 2000000, expMultiplierPerSubLevel: 1.8, damageMultiplierPerSubLevel: 0.12, breakthroughDamageBoost: 3.0, requiredPills: 200, baseSuccessRate: 0.04 },
    { id: 8, name: '大乘', baseRequiredExp: 10000000, expMultiplierPerSubLevel: 1.9, damageMultiplierPerSubLevel: 0.15, breakthroughDamageBoost: 5.0, requiredPills: 500, baseSuccessRate: 0.02 },
    { id: 9, name: '渡劫', baseRequiredExp: 50000000, expMultiplierPerSubLevel: 2.0, damageMultiplierPerSubLevel: 0.20, breakthroughDamageBoost: 10.0, requiredPills: 1000, baseSuccessRate: 0.01 },
    { id: 10, name: '真仙', baseRequiredExp: 200000000, expMultiplierPerSubLevel: 2.2, damageMultiplierPerSubLevel: 0.30, breakthroughDamageBoost: 20.0, requiredPills: 0, baseSuccessRate: 0 }
];

export function getRequiredExp(realmId: number, subLevel: number): number {
    const realm = REALMS.find(r => r.id === realmId);
    if (!realm) return 999999999;
    return Math.floor(realm.baseRequiredExp * Math.pow(realm.expMultiplierPerSubLevel, subLevel - 1));
}

export function getTotalDamageMultiplier(realmId: number, subLevel: number): number {
    let multiplier = 0;
    // 累加大境界加成
    for (let i = 0; i < realmId - 1; i++) {
        multiplier += REALMS[i].breakthroughDamageBoost;
        multiplier += REALMS[i].damageMultiplierPerSubLevel * 9;
    }
    // 累加当前小境界加成
    const currentRealm = REALMS.find(r => r.id === realmId);
    if (currentRealm) {
        multiplier += currentRealm.damageMultiplierPerSubLevel * (subLevel - 1);
    }
    return multiplier;
}
