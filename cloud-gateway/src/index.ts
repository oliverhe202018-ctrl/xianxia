import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import { handleAdCallback } from './adCallback';

const app = new Koa();
const router = new Router();

app.use(bodyParser());

// 微信激励视频服务端回调防刷接口
router.post('/api/ad-callback', handleAdCallback);

// 健康检查接口，供微信云托管探测
router.get('/health', (ctx) => {
    ctx.status = 200;
    ctx.body = 'ok';
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`[Cloud Gateway] Server is running on port ${PORT}`);
});
