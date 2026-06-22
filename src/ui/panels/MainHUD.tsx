import React from 'react';
import { useUserStore } from '../hooks/useUserStore';
import { UIManager } from '../UIManager';

export const MainHUD: React.FC = () => {
    const userState = useUserStore();

    const openPanel = (panelId: string) => {
        UIManager.getInstance().push({ panelId, isModal: true });
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none', // HUD 本身不拦截点击
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            {/* 顶部资源条 */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '20px' }}>
                <div style={resourceStyle}>
                    🪙 灵石: {userState.exp}
                </div>
                <div style={resourceStyle}>
                    📜 天书: {userState.heavenlyScrolls || userState.exp /* fallback if undefined */}
                </div>
                <div style={resourceStyle}>
                    ☁️ 境界: {userState.realmName}
                </div>
            </div>

            {/* 底部按钮栏 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', pointerEvents: 'auto' }}>
                <button style={btnStyle} onClick={() => openPanel('RealmBreakPanel')}>
                    ⬆️ 突破境界
                </button>
                <button style={btnStyle} onClick={() => openPanel('GachaPanel')}>
                    📖 古卷参悟
                </button>
                <button style={btnStyle} onClick={() => openPanel('RunePanel')}>
                    🎒 法印背包
                </button>
            </div>
        </div>
    );
};

const resourceStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '8px 15px',
    borderRadius: '20px',
    color: '#d4af37',
    fontWeight: 'bold',
    border: '1px solid #d4af37'
};

const btnStyle: React.CSSProperties = {
    padding: '15px 30px',
    backgroundColor: '#1a1a1a',
    border: '2px solid #d4af37',
    color: '#d4af37',
    fontWeight: 'bold',
    fontSize: '18px',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
};
