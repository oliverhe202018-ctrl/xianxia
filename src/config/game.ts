/**
 * 游戏全局配置常量。
 */
export const GAME = {
  /** 画布宽度（像素） */
  WIDTH: 800,
  /** 画布高度（像素） */
  HEIGHT: 600,
  /** 目标帧率 */
  TARGET_FPS: 60,
  /** Pixi.js 应用配置 */
  APP_OPTIONS: {
    resizeTo: window,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  }
} as const;
