import { useState, useEffect } from 'react';
import { UserStore } from '../../store/UserStore';

/**
 * 自定义 Hook：监听底层引擎状态
 */
export function useUserStore() {
    // 强制触发 React 渲染的句柄
    const [_, forceUpdate] = useState(0);
    const store = UserStore.getInstance();

    useEffect(() => {
        // 当底层抛出 update 事件时，强制刷新组件
        const handleUpdate = () => forceUpdate(n => n + 1);
        store.on('update', handleUpdate);
        
        return () => {
            store.off('update', handleUpdate);
        };
    }, []);

    // 暴露只读数据给 UI
    return {
        exp: store.getExp(),
        level: store.getLevel(),
        isVip: store.getIsVip(),
        realmName: store.getRealmName() 
    };
}
