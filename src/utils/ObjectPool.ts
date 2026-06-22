/**
 * 泛型对象池 — 用于批量创建/销毁对象的内存复用。
 * 适用于弹幕、敌人、粒子等高频生命周期实体。
 */
export class ObjectPool<T extends object> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn?: (obj: T) => void;

  constructor(
    factory: () => T,
    options?: { initialSize?: number; resetFn?: (obj: T) => void }
  ) {
    this.factory = factory;
    this.resetFn = options?.resetFn;

    const size = Math.max(0, options?.initialSize ?? 0);
    for (let i = 0; i < size; i++) {
      this.pool.push(this.factory());
    }
  }

  /** 从池中获取一个对象。池空则调用 factory 创建新实例。 */
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /** 将对象归还到池中，并执行 resetFn（若有）。 */
  release(obj: T): void {
    this.resetFn?.(obj);
    this.pool.push(obj);
  }

  /** 当前池中可用数量 */
  get availableCount(): number {
    return this.pool.length;
  }

  /** 预填充指定数量的空闲对象 */
  warmup(count: number): void {
    const current = this.pool.length;
    for (let i = current; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  /** 清空池并释放所有引用（不调用 resetFn） */
  clear(): void {
    this.pool.length = 0;
  }
}
