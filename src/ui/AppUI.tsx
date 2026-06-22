import React, { useState, useEffect } from 'react';
import { UIManager, UIConfig } from './UIManager';
import { RealmBreakPanel } from './panels/RealmBreakPanel';
import { GachaPanel } from './panels/GachaPanel';
import { RunePanel } from './panels/RunePanel';
import { MainHUD } from './panels/MainHUD';

// 组件注册表，用于根据字符串 ID 动态渲染组件
const panelRegistry: Record<string, React.FC<any>> = {
    'RealmBreakPanel': RealmBreakPanel,
    'GachaPanel': GachaPanel,
    'RunePanel': RunePanel
};

export const AppUI: React.FC = () => {
    const [panels, setPanels] = useState<UIConfig[]>([]);

    useEffect(() => {
        const uiManager = UIManager.getInstance();
        
        const handleStackChanged = (newStack: UIConfig[]) => {
            setPanels(newStack);
        };

        uiManager.on('stack_changed', handleStackChanged);

        return () => {
            uiManager.off('stack_changed', handleStackChanged);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* 常驻 HUD 层，不拦截底层点击 (由组件内部配置) */}
            <MainHUD />

            {/* 动态弹窗栈 */}
            {panels.map((config, index) => {
                const PanelComponent = panelRegistry[config.panelId];
                if (!PanelComponent) return null;

                // 修复：永远由外层透传，交由具体面板(PanelComponent)自身判断是否阻断点击
                const pointerEvents = 'none';

                return (
                    <div 
                        key={`${config.panelId}-${index}`} 
                        style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%',
                            pointerEvents: pointerEvents,
                            zIndex: 1000 + index
                        }}
                    >
                        <PanelComponent {...config.props} />
                    </div>
                );
            })}
        </div>
    );
};
