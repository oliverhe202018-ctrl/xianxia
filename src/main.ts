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
import { GachaSystem } from './systems/GachaSystem';

// ★ HMR 防污染：重置所有单例
if ((import.meta as any).hot) {
    (import.meta as any).hot.dispose(() => {
        EventBus.clear();                     // 清空所有事件监听
        GachaSystem.resetInstance();          // 销毁 GachaSystem
        GameState.getInstance().setPhase(GamePhase.LOBBY); // 重置状态
    });
}

async function main(): Promise<void> {
  const userStore = UserStore.getInstance();
  await userStore.fetchUserData();
  initUI();
  GameState.getInstance().setStones(userStore.getStartingEnergy());

  const app = new Application({
    ...GAME.APP_OPTIONS,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
  });

  document.body.appendChild(app.view as HTMLCanvasElement);
  app.stage.sortableChildren = true;
  app.stage.name = 'Stage';

  // ── ★ 全局调试探针 ───────────────────────────────────────────────────────
  // 若控制台打印出 name 为 'GoldenFrame' / 'LobbyOverlay' / 'ModalPanel'
  // 等非预期对象，说明对应 eventMode 仍未正确关闭，需进一步检查
  app.stage.eventMode = 'static';
  app.stage.on('pointerdown', (e) => {
    const t = e.target as any;
    console.log(
      `[DebugProbe] pointerdown → target.name: "${t?.name ?? '(unnamed)'}"`,
      `| eventMode: ${t?.eventMode ?? 'unknown'}`,
      t
    );
  });
  // ─────────────────────────────────────────────────────────────────────────

  await AssetLoader.loadAssets();

  const mapManager = new MapManager();
  mapManager.view.name = 'MapLayer';

  const gameUI = new GameUI();
  const entityManager = new EntityManager();
  entityManager.container.name = 'EntityLayer';

  const towerManager = new TowerManager();
  towerManager.container.name = 'TowerLayer';
  towerManager.uiContainer.name = 'TowerUILayer';

  const movementSystem = new MovementSystem(entityManager, mapManager.getWaypoints());
  const waveManager = new WaveManager(entityManager, mapManager.getWaypoints());
  const targetingSystem = new TargetingSystem(towerManager, entityManager);
  const combatSystem = new CombatSystem(towerManager, entityManager);

  // ── 全局 4 阶 zIndex 层级树重构 ──────────────────────────────────────────────
  // Tier 1 (最底层): 全屏环境背景图
  mapManager.bgLayer.zIndex = 0;
  
  // Tier 2 (装饰层): 纯装饰性 UI（如大理石边框），防止遮挡游戏操作
  gameUI.mainUILayer.zIndex = 10;
  
  // Tier 3 (游戏层): 实体、塔防、地图格子
  mapManager.view.zIndex = 50;
  entityManager.container.zIndex = 50;
  towerManager.container.zIndex = 50;
  
  // Tier 4 (交互UI层): 塔防UI、全局UI按钮等，确保可点击
  towerManager.uiContainer.zIndex = 100;
  gameUI.view.zIndex = 100;
  
  // Tier 5 (拖拽层): 拖拽组件必须在绝对顶层
  InputManager.getInstance().dragLayer.zIndex = 999;
  InputManager.getInstance().dragLayer.name = 'DragLayer';

  // Tier 6 (全局遮罩层): 最高层级，用于大厅及全屏遮挡
  gameUI.overlayLayer.zIndex = 9000;

  const mapOffsetX = (GAME.WIDTH - 15 * 40) / 2;
  const mapOffsetY = (GAME.HEIGHT - 10 * 40) / 2 + 40;

  // Tier 3 游戏层需要偏移，对齐地图居中
  mapManager.view.position.set(mapOffsetX, mapOffsetY);
  entityManager.container.position.set(mapOffsetX, mapOffsetY);
  towerManager.container.position.set(mapOffsetX, mapOffsetY);
  // towerUI 层跟随偏移，确保插槽对应正确
  towerManager.uiContainer.position.set(mapOffsetX, mapOffsetY);

  // 严格挂载各层
  app.stage.addChild(mapManager.bgLayer);
  app.stage.addChild(gameUI.mainUILayer);
  app.stage.addChild(mapManager.view);
  app.stage.addChild(entityManager.container);
  app.stage.addChild(towerManager.container);
  app.stage.addChild(towerManager.uiContainer);
  app.stage.addChild(gameUI.view);
  app.stage.addChild(InputManager.getInstance().dragLayer);
  app.stage.addChild(gameUI.overlayLayer);

  const startGame = () => {
    GameState.getInstance().resetGame(userStore.getStartingEnergy());
    entityManager.reset();
    waveManager.reset();
    mapManager.generateLevelMap(1);
    const newWaypoints = mapManager.getWaypoints();
    waveManager.setWaypoints(newWaypoints);
    movementSystem.setWaypoints(newWaypoints);
  };

  EventBus.clear('level:start');
  EventBus.on('level:start', (data: { level: number }) => {
    mapManager.generateLevelMap(data.level);
    const newWaypoints = mapManager.getWaypoints();
    waveManager.setWaypoints(newWaypoints);
    movementSystem.setWaypoints(newWaypoints);
  });

  EventBus.clear('game:over');
  EventBus.on('game:over', () => {
    gameUI.showGameOver(
      () => { startGame(); },
      () => {
        GameState.getInstance().setPhase(GamePhase.LOBBY);
        gameUI.showLobby(() => { startGame(); });
      }
    );
  });

  gameUI.showLobby(() => { startGame(); });

  app.ticker.add((delta: number) => {
    const deltaMS = app.ticker.deltaMS;
    const phase = GameState.getInstance().phase;

    if (mapManager.bgSprite) {
      mapManager.bgSprite.tilePosition.x -= 0.5 * delta;
      mapManager.bgSprite.tilePosition.y += 0.2 * delta;
    }

    if (phase !== GamePhase.PLAYING) return;

    mapManager.update(deltaMS);
    waveManager.update(deltaMS);
    movementSystem.update(delta);
    targetingSystem.update();
    combatSystem.update(deltaMS, delta);
    entityManager.cleanup();
  });

  console.log('[xianxia-td] Pixi.js application initialized.');
  console.log(`[xianxia-td] Canvas size: ${GAME.WIDTH} x ${GAME.HEIGHT}`);
}

main().catch((err) => {
  console.error('[xianxia-td] Failed to initialize:', err);
});
