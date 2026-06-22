import React, { useEffect } from 'react';
import { UIManager } from '../UIManager';
import { RealmSystem } from '../../systems/RealmSystem';
import { useUserStore } from '../hooks/useUserStore';

export const RealmBreakPanel: React.FC = () => {
    // 1. 状态驱动：拿到底层最新数据
    const userState = useUserStore();

    // 2. 生命周期桥接
    useEffect(() => {
        const uiManager = UIManager.getInstance();
        const onPause = () => console.log('[RealmBreakPanel] 弹窗被盖住了，暂停某些动画');
        const onResume = () => console.log('[RealmBreakPanel] 弹窗重新处于顶层');
        
        uiManager.on('RealmBreakPanel:pause', onPause);
        uiManager.on('RealmBreakPanel:resume', onResume);
        
        return () => {
            uiManager.off('RealmBreakPanel:pause', onPause);
            uiManager.off('RealmBreakPanel:resume', onResume);
        };
    }, []);

    // 3. 事件交互下发给底层，UI 仅做调度
    const handleBreakthrough = () => {
        const success = RealmSystem.getInstance().attemptBreakthrough();
        if (success) {
            alert('渡劫成功！');
            UIManager.getInstance().pop(); // 成功则关闭弹窗
        } else {
            alert('修为不足，渡劫失败！');
        }
    };

    const handleClose = () => {
        UIManager.getInstance().pop();
    };

    return (
        <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto' // 拦截点击到底层的 Canvas
        }}>
            <div style={{
                backgroundColor: '#2a2a2a',
                border: '2px solid #d4af37',
                borderRadius: '10px',
                padding: '30px',
                color: 'white',
                textAlign: 'center',
                minWidth: '300px'
            }}>
                <h2 style={{ color: '#d4af37', marginBottom: '20px' }}>突破境界</h2>
                <p style={{ fontSize: '18px', marginBottom: '10px' }}>当前境界：{userState.realmName}</p>
                <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '30px' }}>
                    修为：{userState.exp}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <button 
                        onClick={handleBreakthrough}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#d4af37',
                            border: 'none',
                            color: '#000',
                            fontWeight: 'bold',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        渡劫突破
                    </button>
                    <button 
                        onClick={handleClose}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#555',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
