import { EventEmitter } from '../utils/EventEmitter';

export interface UIConfig {
    panelId: string;       // 面板唯一标识 (如 'RealmBreakPanel', 'GachaPanel')
    isModal: boolean;      // 是否为模态弹窗 (带深色遮罩拦截点击)
    props?: any;           // 传递给组件的数据
}

export interface UIPanelLifecycle {
    onEnter?(props: any): void;       // 压入栈，组件即将挂载
    onResume?(): void;                // 上层弹窗被关，自身重新暴露在顶层
    onPause?(): void;                 // 被新的弹窗盖住
    onExit?(): void;                  // 彻底出栈，清理监听器
}

export class UIManager extends EventEmitter {
    private static instance: UIManager;
    // 维护激活的 UI 面板栈
    private panelStack: UIConfig[] = [];
    
    private constructor() { super(); }

    public static getInstance(): UIManager {
        if (!UIManager.instance) {
            UIManager.instance = new UIManager();
        }
        return UIManager.instance;
    }

    /**
     * 打开一个新面板
     */
    public push(config: UIConfig): void {
        const top = this.getTop();
        if (top) {
            this.emit(`${top.panelId}:pause`); // 通知当前顶层组件暂停
        }
        this.panelStack.push(config);
        this.emit('stack_changed', [...this.panelStack]); // 驱动 React 重新渲染栈列表
    }

    /**
     * 关闭顶层面板
     */
    public pop(): void {
        if (this.panelStack.length === 0) return;
        
        const removed = this.panelStack.pop();
        this.emit(`${removed?.panelId}:exit`); // 通知被销毁组件清理

        const top = this.getTop();
        if (top) {
            this.emit(`${top.panelId}:resume`); // 唤醒下层组件
        }
        this.emit('stack_changed', [...this.panelStack]);
    }

    public getTop(): UIConfig | undefined {
        return this.panelStack[this.panelStack.length - 1];
    }
}
