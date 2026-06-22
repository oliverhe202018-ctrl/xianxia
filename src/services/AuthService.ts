import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 声明微信小程序全局对象以绕过类型检查
declare const wx: any;

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'; // 替换为真实的 Supabase 项目 URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // 替换为真实的 Anon Key

export class AuthService {
    private static instance: AuthService;
    public supabase!: SupabaseClient;
    public currentUserId: string | null = null;

    private constructor() {
        // 初始时创建一个未鉴权的 fallback 客户端
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    public async silentLogin(): Promise<void> {
        return new Promise((resolve, reject) => {
            // 在普通 H5 / 浏览器环境下 mock 微信登录
            if (typeof wx === 'undefined') {
                console.warn('[AuthService] 未检测到微信环境，使用 mock_code 尝试登录');
                this.mockLogin().then(resolve).catch(reject);
                return;
            }

            // 1. 调用微信底层 API 获取短期 Code
            wx.login({
                success: async (res: any) => {
                    if (res.code) {
                        try {
                            await this.fetchTokenAndInitialize(res.code);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        reject(new Error('wx.login 失败：' + res.errMsg));
                    }
                },
                fail: (err: any) => reject(err)
            });
        });
    }

    private async mockLogin(): Promise<void> {
        const mockCode = 'mock_' + Math.floor(Math.random() * 1000000);
        await this.fetchTokenAndInitialize(mockCode);
    }

    private async fetchTokenAndInitialize(code: string): Promise<void> {
        // 2. 将 Code 抛给 Supabase Edge Function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/wechat-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        this.currentUserId = data.userId;

        // 3. 使用下发的自定义 JWT 覆盖默认的 Supabase Client 授权
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${data.token}`
                }
            }
        });
        
        console.log('[AuthService] 微信静默登录与 Token 注入成功! UserId:', this.currentUserId);
    }
}
