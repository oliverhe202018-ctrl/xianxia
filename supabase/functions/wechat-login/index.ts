import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as jwt from "https://deno.land/x/djwt@v2.8/mod.ts";

const WX_APP_ID = Deno.env.get("WX_APP_ID") || "mock_appid";
const WX_APP_SECRET = Deno.env.get("WX_APP_SECRET") || "mock_secret";
const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || "mock_jwt_secret_must_be_long_enough_32_chars"; 

serve(async (req) => {
  try {
    const { code } = await req.json();
    if (!code) throw new Error("Missing wx.login code");

    // 1. 拿 code 换取微信 OpenID (沙盒环境可 mock openid)
    let openid = "";
    if (code.startsWith("mock_")) {
        openid = "mock_openid_" + code;
    } else {
        const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
        const wxRes = await fetch(wxUrl);
        const wxData = await wxRes.json();
        openid = wxData.openid;
    }

    if (!openid) throw new Error("Failed to get OpenID from WeChat");

    // 2. 初始化高权限 Admin Client 绕过 RLS 查库
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "http://localhost:54321",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "mock_service_key"
    );

    // 3. 判定用户是否存在，不存在则注册 (映射 Prisma 的 User 表结构)
    let { data: user, error: selectError } = await supabaseAdmin
      .from('User')
      .select('id')
      .eq('wechat_openid', openid)
      .single();

    // 如果出错且不是找不到记录的错，抛出异常
    if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
    }

    if (!user) {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('User')
        .insert([{ wechat_openid: openid, level: 1, exp: 0 }])
        .select('id')
        .single();
        
      if (insertError) throw insertError;
      user = newUser;
    }

    // 4. 签发兼容 Supabase RLS 规范的 JWT Token
    const payload = {
      role: "authenticated",
      sub: user.id,
      iss: "supabase",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7天过期
    };
    
    // 生成 HS256 JWT
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const token = await jwt.create({ alg: "HS256", typ: "JWT" }, payload, key);

    return new Response(JSON.stringify({ token, userId: user.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
