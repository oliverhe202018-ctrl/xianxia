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
import { GameState, GamePhase } from './core/GameState';
import { initUI } from './ui/initUI';
import { AssetLoader } from './utils/AssetLoader';
import { GameUI } from './ui/GameUI';
import { InputManager } from './core/InputManager';
import { EventBus } from './core/EventBus';

async function main(): Promise<void> {
  // ── 局外配置初始化 ──────────────────────────────────────────────
  const userStore = UserStore.getInstance();
  await userStore.fetchUserData(); // 异步拉取用户数据
  
  // 初始化 React UI 层
  initUI();
  
  // 局内数据注入
  GameState.getInstance().setStones(userStore.getStartingEnergy());

  // ── Pixi.js 应用初始化 ────────────────────────────────────────
  const app = new Application({
    ...GAME.APP_OPTIONS,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
  });

  document.body.appendChild(app.view as HTMLCanvasElement);

  // 开启舞台排序，以支持 zIndex 拖拽显示层级
  app.stage.sortableChildren = true;

  // ── 资源预加载 ──────────────────────────────────────────────────
  await AssetLoader.loadAssets();

  // ── 系统初始化 ────────────────────────────────────────────────
  const mapManager = new MapManager();
  const gameUI = new GameUI();
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
  towerManager.uiContainer.zIndex = 30; // UI 层
  gameUI.view.zIndex = 40; // 全局 UI 层 (最上层)
  InputManager.getInstance().dragLayer.zIndex = 50; // 拖拽层

  // 修复地图不在中心导致周围黑屏：统一偏移游戏场景容器
  // TILE_SIZE=40，MAP_GRID 大小是 10行15列，即 600x400。通过居中偏移行坐标，让战场位于正中。
  const mapOffsetX = (GAME.WIDTH - 15 * 40) / 2;
  const mapOffsetY = (GAME.HEIGHT - 10 * 40) / 2 + 40; // Y轴微调避开顶部面板

  mapManager.view.position.set(mapOffsetX, mapOffsetY);
  entityManager.container.position.set(mapOffsetX, mapOffsetY);
  towerManager.container.position.set(mapOffsetX, mapOffsetY);
  towerManager.uiContainer.position.set(mapOffsetX, mapOffsetY);

  app.stage.addChild(mapManager.view);
  app.stage.addChild(entityManager.container);
  app.stage.addChild(towerManager.container);
  app.stage.addChild(towerManager.uiContainer);
  app.stage.addChild(gameUI.view);
  app.stage.addChild(InputManager.getInstance().dragLayer);

  // ── 游戏状态与重置控制 ──────────────────────────────────────────
  const startGame = () => {
      GameState.getInstance().resetGame(userStore.getStartingEnergy());
      entityManager.reset();
      waveManager.reset();
      
      // 第一关
      mapManager.generateLevelMap(1);
      const newWaypoints = mapManager.getWaypoints();
      waveManager.setWaypoints(newWaypoints);
      movementSystem.setWaypoints(newWaypoints);
  };

  EventBus.on('level:start', (data: { level: number }) => {
      mapManager.generateLevelMap(data.level);
      const newWaypoints = mapManager.getWaypoints();
      waveManager.setWaypoints(newWaypoints);
      movementSystem.setWaypoints(newWaypoints);
  });

  EventBus.on('game:over', () => {
      gameUI.showGameOver(
          () => {
              startGame();
          },
          () => {
              GameState.getInstance().setPhase(GamePhase.LOBBY);
              gameUI.showLobby(() => {
                  startGame();
              });
          }
      );
  });

  gameUI.showLobby(() => {
      startGame();
  });

  // ── 游戏主循环 ────────────────────────────────────────────────
  app.ticker.add((delta: number) => {
    const deltaMS = app.ticker.deltaMS; // 距上一帧的真实时间间隔（毫秒）
    const phase = GameState.getInstance().phase;

    // 背景滚动
    if (mapManager.bgSprite) {
        mapManager.bgSprite.tilePosition.x -= 0.5 * delta;
        mapManager.bgSprite.tilePosition.y += 0.2 * delta;
    }

    if (phase !== GamePhase.PLAYING) return;

    mapManager.update(deltaMS);
    waveManager.update(deltaMS);
    movementSystem.update(delta);
    
    // 索敌与战斗逻辑
    targetingSystem.update();
    combatSystem.update(deltaMS, delta);

    // 每帧末尾清理需要销毁的实体，避免迭代器失效卡死 CPU
    entityManager.cleanup();
  });

  console.log('[xianxia-td] Pixi.js application initialized.');
  console.log(`[xianxia-td] Canvas size: ${GAME.WIDTH} x ${GAME.HEIGHT}`);
}

main().catch((err) => {
  console.error('[xianxia-td] Failed to initialize:', err);
});
