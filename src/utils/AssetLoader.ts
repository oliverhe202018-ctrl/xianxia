import { Assets } from 'pixi.js';

export class AssetLoader {
    public static async loadAssets(): Promise<void> {
        // 批量注册渲染资产
        Assets.addBundle('game-assets', {
            bg: 'assets/bg.png',             // 修仙风背景
            grass: 'assets/grass.png',       // 基础空地
            road: 'assets/road.png',         // 怪物行走路线
            rock: 'assets/rock.png',         // 塔基/障碍物
            uiPanel: 'assets/ui_panel.png',  // 状态栏、备战槽九宫格底图
            shovel: 'assets/shovel.png'      // 铲子图标
        });

        // 触发加载并等待全部完成
        await Assets.loadBundle('game-assets');
    }
}
