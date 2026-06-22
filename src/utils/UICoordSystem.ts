import { GAME } from '../config/game';

export class UICoordSystem {
    static getTopRight(offsetX = 0, offsetY = 0) {
        return { x: GAME.WIDTH - offsetX, y: offsetY };
    }

    // 视觉裁剪与边框布局配置
    static getBorderConfig() {
        const thickness = 20; // 大理石边框边缘厚度
        const bottomUIHeight = 80; // 底部预留用于遮挡残影的区域高度
        return {
            width: GAME.WIDTH,
            height: GAME.HEIGHT,
            mask: {
                x: thickness,
                y: thickness,
                width: GAME.WIDTH - thickness * 2,
                height: GAME.HEIGHT - thickness - bottomUIHeight
            }
        };
    }
}