/**
 * 全局事件总线 — 发布/订阅模式。
 * 用于解耦系统间通信（如游戏状态变更、玩家输入、AI决策）。
 */
type Listener = (...args: any[]) => void;

export class EventEmitter {
  private listeners: Map<string, Set<Listener>> = new Map();

  /** 注册事件监听器 */
  on(event: string, listener: Listener): this {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  /** 一次性监听 */
  once(event: string, listener: Listener): this {
    const wrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper as Listener);
  }

  /** 移除指定监听器（不传 listener 则移除该事件全部监听） */
  off(event: string, listener?: Listener): this {
    if (!listener) {
      this.listeners.delete(event);
      return this;
    }
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(event);
    }
    return this;
  }

  /** 触发事件 */
  emit(event: string, ...args: any[]): this {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of set) {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[EventEmitter] Error in listener for "${event}":`, err);
        }
      }
    }
    return this;
  }

  /** 移除所有监听器（可选按事件过滤） */
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /** 获取某事件的监听数量 */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
