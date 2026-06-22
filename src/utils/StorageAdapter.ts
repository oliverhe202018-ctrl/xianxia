declare var wx: any;

export class StorageAdapter {
    private static debounceTimers: Record<string, number> = {};

    public static setItem(key: string, data: any) {
        try {
            const val = JSON.stringify(data);
            if (typeof wx !== 'undefined' && wx.setStorageSync) {
                wx.setStorageSync(key, val);
            } else {
                localStorage.setItem(key, val);
            }
        } catch (e) {
            console.error('[StorageAdapter] 写入本地缓存失败', e);
        }
    }

    public static getItem(key: string): any {
        try {
            let val;
            if (typeof wx !== 'undefined' && wx.getStorageSync) {
                val = wx.getStorageSync(key);
            } else {
                val = localStorage.getItem(key);
            }
            return val ? JSON.parse(val) : null;
        } catch (e) {
            console.error('[StorageAdapter] 读取本地缓存失败', e);
            return null;
        }
    }

    public static removeItem(key: string) {
        try {
            if (typeof wx !== 'undefined' && wx.removeStorageSync) {
                wx.removeStorageSync(key);
            } else {
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.error('[StorageAdapter] 移除本地缓存失败', e);
        }
    }

    // 防抖高频写入
    public static setItemDebounced(key: string, data: any, delayMs: number = 2000) {
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        
        this.debounceTimers[key] = window.setTimeout(() => {
            this.setItem(key, data);
            delete this.debounceTimers[key];
        }, delayMs);
    }
}
