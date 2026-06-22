import React, { useState } from 'react';
import { useUserStore } from '../hooks/useUserStore';
import { UIManager } from '../UIManager';
import { GachaSystem } from '../../systems/GachaSystem';
import { UserStore } from '../../store/UserStore';
import { EquipmentStore } from '../../store/EquipmentStore';

export const GachaPanel: React.FC = () => {
    const userState = useUserStore();
    const [isDrawing, setIsDrawing] = useState(false);
    const [resultMsg, setResultMsg] = useState<string | null>(null);

    const handleClose = () => {
        UIManager.getInstance().pop();
    };

    const handleDraw = async () => {
        const userStore = UserStore.getInstance();
        if (userStore.getHeavenlyScrolls() < 1) {
            alert('无字天书不足！');
            return;
        }

        setIsDrawing(true);
        setResultMsg(null);

        try {
            // Call system logic
            const gachaSystem = GachaSystem.getInstance();
            const results = await gachaSystem.openScroll(
                userStore.getUserId(),
                1,
                userStore.getHeavenlyScrolls(),
                userStore.getPityCounter()
            );

            // Trigger animations in a real game here. We use simple delay to mock
            await new Promise(r => setTimeout(r, 1000));

            const res = results[0];
            setResultMsg(`参悟成功！获得了：【${res.item.name}】`);
            
            // Update local state (since we mocked the Prisma logic in GachaSystem, we need to sync local stores)
            userStore.deductHeavenlyScrolls(1);
            if (res.item.type === 'currency' && res.item.value) {
                // mock adding gold
                console.log(`Earned ${res.item.value} stones`);
            } else if (res.item.type === 'rune') {
                EquipmentStore.getInstance().addRuneToInventory({
                    id: 'rune_' + Date.now(),
                    target_word: '金', // mock
                    modifier_type: 'ADD_PROJECTILE',
                    value: 1
                });
            }

        } catch (err: any) {
            alert(err.message || '参悟发生错误');
        } finally {
            setIsDrawing(false);
        }
    };

    return (
        <div style={modalStyle}>
            <div style={panelStyle}>
                <h2 style={{ color: '#d4af37', marginBottom: '20px' }}>古卷参悟 (抽卡)</h2>
                <p style={{ color: '#ccc', marginBottom: '30px' }}>
                    消耗 1 卷无字天书，可参悟出灵石、残破法印或极品法印。
                    <br/>当前天书数量: {userState.heavenlyScrolls || 0}
                </p>

                {isDrawing ? (
                    <div style={{ color: '#d4af37', fontSize: '24px', margin: '40px 0', animation: 'pulse 1s infinite' }}>
                        参悟中...
                    </div>
                ) : (
                    <div style={{ margin: '40px 0', color: '#fff', fontSize: '18px' }}>
                        {resultMsg || '请点击下方按钮开始参悟'}
                    </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
                    <button onClick={handleDraw} disabled={isDrawing} style={isDrawing ? disabledBtnStyle : btnStyle}>
                        参悟一次
                    </button>
                    <button onClick={handleClose} disabled={isDrawing} style={isDrawing ? disabledBtnStyle : btnStyle}>
                        关闭
                    </button>
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
    backgroundColor: '#1a1a1a',
    border: '2px solid #d4af37',
    borderRadius: '10px',
    padding: '30px',
    color: 'white',
    textAlign: 'center',
    width: '400px'
};

const btnStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#d4af37',
    border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '5px', cursor: 'pointer'
};

const disabledBtnStyle: React.CSSProperties = { ...btnStyle, backgroundColor: '#555', cursor: 'not-allowed' };
