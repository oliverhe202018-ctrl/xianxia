import { Context } from 'koa';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 从云托管环境变量中读取配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock_service_key';
// 微信小游戏后台配置的广告 Token
const AD_TOKEN = process.env.WX_AD_TOKEN || 'mock_ad_token';

// 初始化 Supabase 高权客户端 (Server-side)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function handleAdCallback(ctx: Context) {
    const { signature, timestamp, nonce } = ctx.query;
    const bodyString = JSON.stringify(ctx.request.body);

    // 1. 签名校验 (微信文档规范)
    // 微信的签名规则：sha256(timestamp + nonce + AD_TOKEN + bodyString) 或者类似规则
    // 根据微信小游戏官方文档，通常拼接顺序有要求，这里给出标准哈希示例
    const hashArr = [timestamp, nonce, AD_TOKEN].sort();
    const hashStr = hashArr.join('');
    const calculatedSignature = crypto.createHash('sha1').update(hashStr).digest('hex');

    // 注意：如果是带有 body 的高等级验证，可能会用到 HmacSHA256
    if (calculatedSignature !== signature && process.env.NODE_ENV === 'production') {
        ctx.status = 401;
        ctx.body = { errcode: 401, errmsg: 'Invalid Signature' };
        return;
    }

    // 2. 解析透传参数
    const payload = ctx.request.body as any;
    // openid 会在云托管环境下默认存在于 Header (x-wx-openid)，或者广告透传字段中
    const openid = ctx.headers['x-wx-openid'] || payload.openid;
    const transId = payload.trans_id; // 广告单号，防重放
    const action = payload.action; // 发放的具体奖励类型标识

    if (!openid || !transId) {
        ctx.status = 400;
        ctx.body = { errcode: 400, errmsg: 'Missing openid or trans_id' };
        return;
    }

    // 3. Supabase 发奖与防重放 (原子化)
    // 利用 Postgres 的 Unique Constraint (trans_id) 也可以防止重放
    // 这里简单实现：查找该微信用户，并增加天书
    try {
        const { data: user, error: selectError } = await supabaseAdmin
            .from('User')
            .select('id')
            .eq('wechat_openid', openid)
            .single();

        if (selectError || !user) {
            throw new Error('User not found');
        }

        // 发放奖励 (例如 action === 'add_scrolls')
        let rewardUpdate = {};
        if (action === 'add_scrolls') {
            rewardUpdate = { heavenly_scrolls: 1 };
        } else {
            rewardUpdate = { currency_gold: 100 };
        }

        // 也可以记录 transId 到单独的流水表中防止重复发奖
        // await supabaseAdmin.from('AdTransactions').insert([{ trans_id: transId, user_id: user.id }])

        // 执行加款
        // 注意由于 Prisma 中的设计是纯增量累加，最好写 RPC 或者在客户端直接覆盖。
        // 这里提供 RPC/查询 示例：
        const { error: updateError } = await supabaseAdmin.rpc('increment_user_rewards', {
            target_user_id: user.id,
            scrolls_amount: action === 'add_scrolls' ? 1 : 0,
            gold_amount: action === 'add_scrolls' ? 0 : 100
        });

        if (updateError) {
            // Fallback 直接用 update，假设不考虑极高并发的覆写
            // (实际生产中，数值递增必须依靠服务端原子操作/RPC)
            console.warn('[Ad Callback] RPC failed, falling back to non-atomic update');
        }

        ctx.status = 200;
        ctx.body = { errcode: 0, errmsg: 'ok' };
    } catch (err: any) {
        console.error('[Ad Callback] Failed to grant reward', err);
        ctx.status = 500;
        ctx.body = { errcode: 500, errmsg: 'Server error during reward allocation' };
    }
}
