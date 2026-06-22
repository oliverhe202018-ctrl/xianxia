// 模拟 Supabase 客户端
const supabase = {
    from: (tableName: string) => ({
        upsert: async (dataArray: any[], options: { onConflict: string }) => {
            console.log(`[Supabase Mock] Bulk Upsert to ${tableName}: ${dataArray.length} records. Conflict key: ${options.onConflict}`);
            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            // 模拟 5% 的概率网络错误
            if (Math.random() < 0.05) {
                throw new Error('Network Error or Gateway Timeout');
            }
            return { error: null, data: dataArray };
        },
        update: async (data: any) => {
            console.log(`[Supabase Mock] Direct update to ${tableName}`);
            await new Promise(resolve => setTimeout(resolve, 300));
            return { error: null, data };
        }
    })
};

export class SupabaseService {
    /**
     * 高价值行为：直接强校验更新
     */
    public static async directUpdate(tableName: string, data: any, matchQuery: any): Promise<boolean> {
        try {
            console.log(`[SupabaseService] 正在执行强校验同步...`);
            const { error } = await supabase.from(tableName).update(data);
            if (error) throw error;
            return true;
        } catch (e) {
            console.error(`[SupabaseService] 强校验同步失败:`, e);
            return false;
        }
    }

    /**
     * 批量 Upsert 性能调优：分块处理 + 指定 onConflict 唯一索引
     */
    public static async bulkUpsert(tableName: string, dataArray: any[], conflictKey: string = 'id'): Promise<any[]> {
        if (!dataArray || dataArray.length === 0) return [];

        const CHUNK_SIZE = 500;
        const failedChunks: any[] = [];
        
        console.log(`[SupabaseService] 准备批量同步 ${dataArray.length} 条数据至 ${tableName}`);

        for (let i = 0; i < dataArray.length; i += CHUNK_SIZE) {
            const chunk = dataArray.slice(i, i + CHUNK_SIZE);
            try {
                // 使用 onConflict 确保 Postgres 执行批量更新而非插入报错
                const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: conflictKey });
                if (error) {
                    throw error;
                }
            } catch (err) {
                console.error(`[SupabaseService] 批量同步切片 [${i} - ${i + chunk.length}] 失败:`, err);
                // 将失败的 chunk 记录，以便后续退回 DirtyQueue
                failedChunks.push(...chunk);
            }
        }

        return failedChunks;
    }
}
