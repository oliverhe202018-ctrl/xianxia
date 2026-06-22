import { useState, useEffect } from 'react';
import { EquipmentStore } from '../../store/EquipmentStore';

export function useEquipmentStore() {
    const [_, forceUpdate] = useState(0);
    const store = EquipmentStore.getInstance();

    useEffect(() => {
        const handleUpdate = () => forceUpdate(n => n + 1);
        store.on('update', handleUpdate);
        
        return () => {
            store.off('update', handleUpdate);
        };
    }, []);

    return {
        equippedRunes: store.getEquippedRunes(),
        inventory: store.getInventory(),
        equipRune: (slot: number, rune: any) => store.equipRune(slot, rune),
        unequipRune: (slot: number) => store.unequipRune(slot),
    };
}
