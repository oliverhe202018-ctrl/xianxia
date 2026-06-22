import { StorageAdapter } from '../utils/StorageAdapter';
import { SupabaseService } from '../services/SupabaseService';

export interface SyncDataRecord {
    id: string; // 唯一标识，如 "user_123_stones" 或具体的表记录UUID
    tableName: string;
    data: any;
    timestamp: number;
}

const DIRTY_QUEUE_KEY = 'sync_engine_dirty_queue';

export class SyncEngine {
    private static instance: SyncEngine;
    private dirtyQueue: SyncDataRecord[] = [];
    private syncInterval: number | null = null;
    private isSyncing: boolean = false;

    private constructor() {
        this.restoreFromStorage();
        this.startHeartbeat();
    }

    public static getInstance(): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine();
        }
        return SyncEngine.instance;
    }

    /**
     * 容灾恢复：在启动时检查本地缓存遗留的脏数据
     */
    private restoreFromStorage() {
        const cached = StorageAdapter.getItem(DIRTY_QUEUE_KEY);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            console.warn(`[SyncEngine] 发现上次意外退出遗留的 ${cached.length} 条脏数据，准备静默全量同步`);
            this.dirtyQueue = cached;
            this.forceSync(); // 优先触发全量同步
        }
    }

    /**
     * 持久化当前脏数据队列至防灾缓存
     */
    private persistQueue() {
        // 利用防抖，避免极高频写入阻塞 I/O
        StorageAdapter.setItemDebounced(DIRTY_QUEUE_KEY, this.dirtyQueue, 1000);
    }

    /**
     * 定期心跳机制：每 60 秒触发一次批量同步
     */
    private startHeartbeat() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = window.setInterval(() => {
            this.forceSync();
        }, 60 * 1000);
    }

    /**
     * 普通行为（高频）：进入脏数据队列
     */
    public push(tableName: string, recordId: string, data: any) {
        // 查找队列中是否已有同一条记录，有则覆盖合并
        const existingIdx = this.dirtyQueue.findIndex(r => r.tableName === tableName && r.id === recordId);
        
        const newRecord: SyncDataRecord = {
            id: recordId,
            tableName,
            data,
            timestamp: Date.now()
        };

        if (existingIdx !== -1) {
            // 简单合并覆盖数据
            this.dirtyQueue[existingIdx].data = { ...this.dirtyQueue[existingIdx].data, ...data };
            this.dirtyQueue[existingIdx].timestamp = Date.now();
        } else {
            this.dirtyQueue.push(newRecord);
        }

        this.persistQueue();
    }

    /**
     * 强制立即刷库：用于关卡结算、切换大厅或触发 wx.onHide
     */
    public async forceSync() {
        if (this.isSyncing || this.dirtyQueue.length === 0) return;
        this.isSyncing = true;

        try {
            // 将队列按表名进行分类
            const groupedByTable: Record<string, any[]> = {};
            // 提取快照，防止同步过程中有新数据推入
            const snapshot = [...this.dirtyQueue];
            
            for (const record of snapshot) {
                if (!groupedByTable[record.tableName]) {
                    groupedByTable[record.tableName] = [];
                }
                groupedByTable[record.tableName].push({
                    id: record.id,
                    ...record.data
                });
            }

            let allFailedRecords: SyncDataRecord[] = [];

            // 分别批量 Upsert 到各个表
            for (const [tableName, dataArray] of Object.entries(groupedByTable)) {
                const failedData = await SupabaseService.bulkUpsert(tableName, dataArray, 'id');
                if (failedData.length > 0) {
                    // 找出失败数据对应的原始记录
                    const failedIds = new Set(failedData.map(d => d.id));
                    allFailedRecords.push(...snapshot.filter(r => r.tableName === tableName && failedIds.has(r.id)));
                }
            }

            // 从当前队列中移除已成功的快照数据
            const snapshotIds = new Set(snapshot.map(r => r.id + '_' + r.tableName));
            this.dirtyQueue = this.dirtyQueue.filter(r => !snapshotIds.has(r.id + '_' + r.tableName));

            // 将失败的记录退回队列头部（或者尾部，取决于业务）
            if (allFailedRecords.length > 0) {
                console.warn(`[SyncEngine] 有 ${allFailedRecords.length} 条数据同步失败，退回脏队列等待重试`);
                this.dirtyQueue.unshift(...allFailedRecords);
            } else {
                console.log(`[SyncEngine] 批量同步完成，成功清空 ${snapshot.length} 条脏数据！`);
            }

            this.persistQueue();

        } catch (e) {
            console.error(`[SyncEngine] 批量同步遭遇全局异常:`, e);
        } finally {
            this.isSyncing = false;
        }
    }
}
