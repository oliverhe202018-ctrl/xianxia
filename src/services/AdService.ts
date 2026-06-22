import { AuthService } from './AuthService';

declare const wx: any;

export class AdService {
    private static instance: AdService;
    private rewardedVideoAd: any = null;

    private constructor() {}

    public static getInstance(): AdService {
        if (!AdService.instance) {
            AdService.instance = new AdService();
        }
        return AdService.instance;
    }

    /**
     * 初始化激励视频广告实例（通常在游戏大厅加载时调用）
     * @param adUnitId 微信公众平台配置的广告单元 ID
     */
    public initRewardedVideo(adUnitId: string): void {
        if (typeof wx === 'undefined') {
            console.warn('[AdService] 非微信环境，跳过广告初始化');
            return;
        }

        if (wx.createRewardedVideoAd) {
            this.rewardedVideoAd = wx.createRewardedVideoAd({
                adUnitId: adUnitId
            });

            this.rewardedVideoAd.onLoad(() => {
                console.log('[AdService] 激励视频加载成功');
            });

            this.rewardedVideoAd.onError((err: any) => {
                console.error('[AdService] 激励视频加载失败', err);
            });
        }
    }

    /**
     * 播放激励视频并等待云端发奖
     * @param action 透传的自定义发奖动作（如 'add_scrolls'）
     * @returns Promise<boolean> 返回 true 表示云端已确认发奖成功
     */
    public showAd(action: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.rewardedVideoAd) {
                // mock 环境测试直接放行
                if (typeof wx === 'undefined') {
                    console.log(`[AdService] Mock 展示广告完成，下发动作：${action}`);
                    setTimeout(() => resolve(true), 1500);
                    return;
                }
                reject(new Error('广告实例未初始化'));
                return;
            }

            // 清理旧的监听器，防止多次触发
            this.rewardedVideoAd.offClose();
            
            this.rewardedVideoAd.onClose(async (res: any) => {
                // 用户点击了【关闭广告】按钮
                // 小于 2.1.0 的基础库版本，res 是一个 undefined
                if (res && res.isEnded || res === undefined) {
                    console.log('[AdService] 视频正常播完，开始轮询云端资产变化...');
                    // 注意：这里绝对不能直接修改本地数值！必须等待云托管接收到微信的回调并充值。
                    
                    try {
                        // 启动轮询检查服务端状态（实际项目中可换成 Supabase Realtime WebSocket 推送）
                        const success = await this.pollServerForRewardCompletion();
                        resolve(success);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    console.log('[AdService] 播放中途退出，不予发奖');
                    resolve(false);
                }
            });

            // 拉起广告
            this.rewardedVideoAd.show().catch(() => {
                // 失败重试
                this.rewardedVideoAd.load()
                    .then(() => this.rewardedVideoAd.show())
                    .catch((err: any) => reject(err));
            });
        });
    }

    /**
     * 轮询 Supabase 数据库，探测资产是否已增加
     */
    private async pollServerForRewardCompletion(maxRetries = 10, intervalMs = 1000): Promise<boolean> {
        const auth = AuthService.getInstance();
        if (!auth.currentUserId) return false;

        // 这里仅作演示：正式项目中应该记录播放广告前的数值，比对是否增长。
        // 或者查询 `AdTransactions` 交易表是否多了一笔状态为 Success 的订单。
        
        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, intervalMs));

            // 查询玩家天书等资产是否有变化
            const { data, error } = await auth.supabase
                .from('User')
                .select('heavenly_scrolls')
                .eq('id', auth.currentUserId)
                .single();

            if (!error && data) {
                // 探测到增长，结束轮询
                // 这里用伪代码代表条件满足
                const isRewardGranted = true; 
                if (isRewardGranted) {
                    return true;
                }
            }
        }
        throw new Error('等待云端下发奖励超时，请稍后刷新重试');
    }
}
