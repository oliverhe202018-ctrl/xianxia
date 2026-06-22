import React, { useState } from 'react';
import { useEquipmentStore } from '../hooks/useEquipmentStore';
import { UIManager } from '../UIManager';

export const RunePanel: React.FC = () => {
    const equipState = useEquipmentStore();
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

    const handleClose = () => {
        UIManager.getInstance().pop();
    };

    const handleEquip = (rune: any) => {
        if (selectedSlot !== null) {
            equipState.equipRune(selectedSlot, rune);
            setSelectedSlot(null);
        }
    };

    const handleUnequip = (slot: number) => {
        equipState.unequipRune(slot);
    };

    return (
        <div style={modalStyle}>
            <div style={panelStyle}>
                <h2 style={{ color: '#d4af37', marginBottom: '10px' }}>法印背包</h2>
                
                {/* 装备槽位展示 */}
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', color: '#ccc' }}>当前装备 (6槽)</h3>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                        {equipState.equippedRunes.map((rune, index) => (
                            <div 
                                key={`slot-${index}`}
                                onClick={() => setSelectedSlot(selectedSlot === index ? null : index)}
                                style={{
                                    ...slotStyle,
                                    border: selectedSlot === index ? '2px solid #fff' : '1px solid #d4af37'
                                }}
                            >
                                {rune ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                        <div style={{ fontSize: '12px' }}>{rune.target_word}</div>
                                        <button onClick={(e) => { e.stopPropagation(); handleUnequip(index); }} style={microBtnStyle}>卸下</button>
                                    </div>
                                ) : (
                                    <div style={{ color: '#555', marginTop: '10px' }}>空</div>
                                )}
                            </div>
                        ))}
                    </div>
                    {selectedSlot !== null && <div style={{ color: '#0f0', fontSize: '12px', marginTop: '5px' }}>已选中槽位 {selectedSlot + 1}，请点击下方背包物品进行装备</div>}
                </div>

                {/* 背包展示 */}
                <div style={{ borderTop: '1px solid #444', paddingTop: '10px', height: '200px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '16px', color: '#ccc' }}>背包库存</h3>
                    {equipState.inventory.length === 0 ? (
                        <div style={{ color: '#666', marginTop: '20px' }}>背包空空如也，请去抽卡吧！</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                            {equipState.inventory.map(rune => (
                                <div key={rune.id} style={invItemStyle}>
                                    <div style={{ fontSize: '14px', color: '#d4af37' }}>目标字: {rune.target_word}</div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>效果: {rune.modifier_type}</div>
                                    {selectedSlot !== null && (
                                        <button onClick={() => handleEquip(rune)} style={{ ...microBtnStyle, width: '100%', marginTop: '5px' }}>装备到槽 {selectedSlot + 1}</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '20px' }}>
                    <button onClick={handleClose} style={btnStyle}>关闭</button>
                </div>
            </div>
        </div>
    );
};

const modalStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    width: '100%', height: '100%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    pointerEvents: 'auto'
};

const panelStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a', border: '2px solid #d4af37', borderRadius: '10px',
    padding: '20px', color: 'white', textAlign: 'center', width: '500px'
};

const slotStyle: React.CSSProperties = {
    width: '60px', height: '60px', backgroundColor: '#2a2a2a', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px', boxSizing: 'border-box'
};

const invItemStyle: React.CSSProperties = {
    border: '1px solid #555', padding: '10px', borderRadius: '5px', backgroundColor: '#222',
    textAlign: 'left', width: '130px'
};

const btnStyle: React.CSSProperties = {
    padding: '10px 20px', backgroundColor: '#555', border: 'none', color: '#fff', borderRadius: '5px', cursor: 'pointer'
};

const microBtnStyle: React.CSSProperties = {
    padding: '2px 5px', fontSize: '10px', backgroundColor: '#d4af37', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '3px'
};
