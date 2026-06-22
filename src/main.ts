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

  mapManager.view.zIndex = 0;
  entityManager.container.zIndex = 10;
  towerManager.container.zIndex = 20;
  towerManager.uiContainer.zIndex = 30;
  gameUI.view.zIndex = 40;
  InputManager.getInstance().dragLayer.zIndex = 50;
  InputManager.getInstance().dragLayer.name = 'DragLayer';

  const mapOffsetX = (GAME.WIDTH - 15 * 40) / 2;
  const mapOffsetY = (GAME.HEIGHT - 10 * 40) / 2 + 40;

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

  const startGame = () => {
    GameState.getInstance().resetGame(userStore.getStartingEnergy());
    entityManager.reset();
    waveManager.reset();
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
