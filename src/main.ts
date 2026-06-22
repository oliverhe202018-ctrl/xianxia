import { Application } from 'pixi.js';
import { GAME } from './config/game';
import { MapManager } from './core/MapManager';
import { EntityManager } from './core/EntityManager';
import { TowerManager } from './core/TowerManager';
import { WaveManager } from './core/WaveManager';
import { MovementSystem } from './systems/MovementSystem';
import { TargetingSystem } from './systems/TargetingSystem';
import { CombatSystem } from './systems/CombatSystem';
import { UserStore } from './store/UserStore';
import { GameState } from './core/GameState';

async function main(): Promise<void> {
  // ── 局外配置初始化 ──────────────────────────────────────────────
  const userStore = UserStore.getInstance();
  await userStore.fetchUserData(); // 异步拉取用户数据
  
  // 局内数据注入
  GameState.getInstance().setStones(userStore.getStartingEnergy());

  // ── Pixi.js 应用初始化 ────────────────────────────────────────
  const app = new Application();

  await app.init({
    ...GAME.APP_OPTIONS,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
  });

  document.body.appendChild(app.canvas);

  // 开启舞台排序，以支持 zIndex 拖拽显示层级
  app.stage.sortableChildren = true;

  // ── 系统初始化 ────────────────────────────────────────────────
  const mapManager = new MapManager();
  const entityManager = new EntityManager();
  const towerManager = new TowerManager();
  
  const movementSystem = new MovementSystem(entityManager, mapManager.getWaypoints());
  const waveManager = new WaveManager(entityManager, mapManager.getWaypoints());
  const targetingSystem = new TargetingSystem(towerManager, entityManager);
  const combatSystem = new CombatSystem(towerManager, entityManager);

  // ── 层级管理 ──────────────────────────────────────────────────
  mapManager.view.zIndex = 0; // 最底层地图
  entityManager.container.zIndex = 10; // 敌人与弹道、特效层
  towerManager.container.zIndex = 20; // 塔防层 (放置后)
  towerManager.uiContainer.zIndex = 30; // UI 层 (最上层)

  app.stage.addChild(mapManager.view);
  app.stage.addChild(entityManager.container);
  app.stage.addChild(towerManager.container);
  app.stage.addChild(towerManager.uiContainer);

  // ── 游戏主循环 ────────────────────────────────────────────────
  app.ticker.add((ticker) => {
    const delta = ticker.deltaTime; // 帧率系数，通常为 1
    const deltaMS = ticker.deltaMS; // 距上一帧的真实时间间隔（毫秒）

    waveManager.update(deltaMS);
    movementSystem.update(delta);
    
    // 索敌与战斗逻辑
    targetingSystem.update();
    combatSystem.update(deltaMS, delta);
  });

  console.log('[xianxia-td] Pixi.js application initialized.');
  console.log(`[xianxia-td] Canvas size: ${GAME.WIDTH} x ${GAME.HEIGHT}`);
}

main().catch((err) => {
  console.error('[xianxia-td] Failed to initialize:', err);
});
