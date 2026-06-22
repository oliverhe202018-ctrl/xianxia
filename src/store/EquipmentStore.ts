import { Rune } from '../types/Rune';

export class EquipmentStore {
    private static instance: EquipmentStore;

    // 6 个法印槽位，null 表示未装备
    private equippedRunes: (Rune | null)[] = Array(6).fill(null);

    private constructor() {
        // 为了验证战斗逻辑，这里预先注入两个模拟的强力法印
        this.equippedRunes[0] = {
            id: 'mock-rune-sword',
            target_word: '剑',
            modifier_type: 'ADD_PROJECTILE',
            value: 2 // 剑塔增加 2 发额外弹道
        };

        this.equippedRunes[1] = {
            id: 'mock-rune-fire',
            target_word: '火',
            modifier_type: 'ADD_AOE_RADIUS',
            value: 80 // 火塔爆炸范围扩大 80 像素
        };
    }

    public static getInstance(): EquipmentStore {
        if (!EquipmentStore.instance) {
            EquipmentStore.instance = new EquipmentStore();
        }
        return EquipmentStore.instance;
    }

    /**
     * 装备法印到指定槽位
     */
    public equipRune(slotIndex: number, rune: Rune): boolean {
        if (slotIndex < 0 || slotIndex >= 6) return false;
        this.equippedRunes[slotIndex] = rune;
        return true;
    }

    /**
     * 卸下指定槽位的法印
     */
    public unequipRune(slotIndex: number): void {
        if (slotIndex >= 0 && slotIndex < 6) {
            this.equippedRunes[slotIndex] = null;
        }
    }

    /**
     * 核心：提供给 CombatSystem，筛选出对当前汉字塔生效的所有已装备法印
     */
    public getRunesForWord(charName: string): Rune[] {
        return this.equippedRunes.filter((r): r is Rune => r !== null && r.target_word === charName);
    }
}
