import { NineSlicePlane, Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { UICoordSystem } from '../utils/UICoordSystem';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { GameOverPanel } from './panels/GameOverPanel';
import { UIManager } from './UIManager';
import { GAME } from '../config/game';

// 统一字体样式表 (配置全局渲染参数)
export const TextStyles = {
    Title: new TextStyle({
        fontFamily: ['"Microsoft YaHei"', 'sans-serif'], 
        fontSize: 24,
        fontWeight: 'bold',
        fill: ['#FFF8DC', '#DAA520'], // 修仙风渐变金
        stroke: '#4A2511',           // 深色描边提升辨识度
        strokeThickness: 4,
        dropShadow: true,            // 激活内置阴影
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 4,
        dropShadowDistance: 4,
    })
};

export class GameUI {
    public view: Container = new Container();

    // 逻辑子容器划分，便于独立控制交互
    public mainUILayer: Container = new Container();
    public statusBarContainer: Container = new Container();
    public gatherSpiritButtonContainer: Container = new Container();
    public shovelToolContainer: Container = new Container();
    public bottomNavigationContainer: Container = new Container();
    public overlayLayer: Container = new Container();

    constructor() {
        this.view.name = 'GameUIRoot';
        this.mainUILayer.name = 'MainUILayer';
        this.statusBarContainer.name = 'StatusBarLayer';
        this.gatherSpiritButtonContainer.name = 'GatherSpiritButtonLayer';
        this.shovelToolContainer.name = 'ShovelButtonLayer';
        this.bottomNavigationContainer.name = 'BottomNavigationLayer';
        this.overlayLayer.name = 'OverlayLayer';
        this.overlayLayer.sortableChildren = true;
        this.overlayLayer.eventMode = 'none';

        // 根容器绝不参与 hit test，避免全屏 UI 容器抢事件
        this.view.eventMode = 'none';
        this.view.interactive = false;
        (this.view as any).hitArea = null;

        // 纯装饰层绝不参与交互
        this.mainUILayer.eventMode = 'none';
        this.mainUILayer.interactive = false;
        (this.mainUILayer as any).hitArea = null;

        // 只有实际可点击的按钮容器保留交互能力
        this.statusBarContainer.eventMode = 'passive';
        this.statusBarContainer.interactive = false;
        (this.statusBarContainer as any).hitArea = null;

        this.gatherSpiritButtonContainer.eventMode = 'passive';
        this.gatherSpiritButtonContainer.interactive = false;
        (this.gatherSpiritButtonContainer as any).hitArea = null;

        this.shovelToolContainer.eventMode = 'passive';
        this.shovelToolContainer.interactive = false;
        (this.shovelToolContainer as any).hitArea = null;

        this.bottomNavigationContainer.eventMode = 'passive';
        this.bottomNavigationContainer.interactive = false;
        (this.bottomNavigationContainer as any).hitArea = null;

        this.view.addChild(this.statusBarContainer);
        this.view.addChild(this.gatherSpiritButtonContainer);
        this.view.addChild(this.shovelToolContainer);
        this.view.addChild(this.bottomNavigationContainer);
        
        this.createMainBorder();
        this.createTopBar();
        this.createJuLingButton();
        this.createShovelButton();
    }

    // 第二步：完善金色大理石边框表现并清理旧 UI 残影
    private createMainBorder() {
        const border = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        border.name = 'GoldenFrame';
        const config = UICoordSystem.getBorderConfig();
        
        border.width = config.width;
        border.height = config.height;
        border.position.set(0, 0);
        border.zIndex = -1;

        // 金色边框是纯装饰对象，彻底剥夺交互权
        border.eventMode = 'none';
        border.interactive = false;
        (border as any).hitArea = null;

        // 旧实现使用 hole-mask Graphics 覆盖全屏，这个 Graphics 即使不可见也可能参与命中链。
        // 改为严格禁用交互并命名，便于用全局探针验证。
        const frameMask = new Graphics();
        frameMask.name = 'GoldenFrameMask';
        frameMask.beginFill(0xFFFFFF);
        frameMask.drawRect(0, 0, config.width, config.height);
        frameMask.beginHole();
        frameMask.drawRect(config.mask.x, config.mask.y, config.mask.width, config.mask.height);
        frameMask.endHole();
        frameMask.endFill();
        frameMask.eventMode = 'none';
        frameMask.interactive = false;
        (frameMask as any).hitArea = null;

        border.mask = frameMask;

        this.mainUILayer.addChild(frameMask);
        this.mainUILayer.addChild(border);
    }

    // 构建顶部状态栏/底部备战槽
    private createTopBar() {
        const topBar = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        topBar.name = 'TopStatusBarBg';
        topBar.width = 300;
        topBar.height = 60;
        topBar.eventMode = 'none';
        topBar.interactive = false;
        (topBar as any).hitArea = null;
        
        const pos = UICoordSystem.getTopRight(310, 10);
        topBar.position.set(pos.x, pos.y);
        this.statusBarContainer.addChild(topBar);

        const stonesText = new Text('', {
            fontFamily: ['"Microsoft YaHei"', 'sans-serif'],
            fontSize: 20,
            fill: 0xDAA520,
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 2
        });
        stonesText.name = 'TopStatusText';
        stonesText.anchor.set(0.5);
        stonesText.position.set(pos.x + topBar.width / 2, pos.y + topBar.height / 2);
        stonesText.eventMode = 'none';
        this.statusBarContainer.addChild(stonesText);

        GameState.getInstance().onStateChanged((stones, health, maxHealth) => {
            stonesText.text = `灵石: ${stones} | 生命: ${health}/${maxHealth}`;
        });
    }

    // 构建带 Yoyo 缩放缓动反馈的“聚灵”按钮
    private createJuLingButton() {
        const btn = new Sprite(Assets.get('uiPanel'));
        btn.name = 'GatherSpiritButton';
        btn.width = 120;
        btn.height = 50;
        btn.anchor.set(0.5);
        // ★ 修复：移到右下角——底部导航栏最右侧槽位
        const slotX = GAME.WIDTH - 50;
        const slotY = GAME.HEIGHT - 40;
        btn.position.set(slotX, slotY);

        // 按钮文案从按钮 Sprite 内剥离，避免文案成为边框/按钮子树中的命中歧义节点
        const label = new Text('聚灵', TextStyles.Title);
        label.name = 'GatherSpiritButtonLabel';
        label.anchor.set(0.5);
        label.position.set(slotX, slotY);
        label.eventMode = 'none';

        // 仅按钮本体可点击
        btn.eventMode = 'static';
        btn.interactive = true;
        btn.cursor = 'pointer';

        let isOnCooldown = false;
        
        const cooldownRing = new Graphics();
        cooldownRing.name = 'GatherSpiritCooldownRing';
        cooldownRing.visible = false;
        cooldownRing.eventMode = 'none';
        btn.addChild(cooldownRing);

        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            if (isOnCooldown) return;

            btn.scale.set(0.9);
            EventBus.emit('gacha:request', { amount: 1 });

            isOnCooldown = true;
            cooldownRing.visible = true;
            
            const cooldownTime = 1000;
            const startTime = performance.now();
            
            const animateCooldown = () => {
                const elapsed = performance.now() - startTime;
                if (elapsed >= cooldownTime) {
                    isOnCooldown = false;
                    cooldownRing.visible = false;
                    cooldownRing.clear();
                    btn.scale.set(1.0);
                } else {
                    const ratio = elapsed / cooldownTime;
                    cooldownRing.clear();
                    cooldownRing.lineStyle(4, 0x00FFFF, 0.8);
                    cooldownRing.arc(0, 0, btn.width / 2 + 5, -Math.PI / 2, -Math.PI / 2 + (1 - ratio) * Math.PI * 2, false);
                    requestAnimationFrame(animateCooldown);
                }
            };
            requestAnimationFrame(animateCooldown);
        });
        
        btn.on('pointerup', () => {
            if (!isOnCooldown) btn.scale.set(1.0);
        });
        btn.on('pointerupoutside', () => {
            if (!isOnCooldown) btn.scale.set(1.0);
        });
        
        this.gatherSpiritButtonContainer.addChild(btn);
        this.gatherSpiritButtonContainer.addChild(label);
    }

    private createShovelButton() {
        const btn = new Sprite(Assets.get('shovel'));
        btn.name = 'ShovelButton';
        btn.anchor.set(0.5);
        const slotX = GAME.WIDTH - 120;
        const slotY = GAME.HEIGHT - 40;
        btn.position.set(slotX, slotY);
        btn.width = 64;
        btn.height = 64;
        
        btn.visible = false;
        btn.eventMode = 'none';
        btn.interactive = true;
        btn.cursor = 'pointer';

        // 数量角标
        const countBadge = new Text('0', {
            fontSize: 16, fill: 0xFF4444, fontWeight: 'bold',
            stroke: '#000000', strokeThickness: 3
        });
        countBadge.name = 'ShovelCountBadge';
        countBadge.anchor.set(0.5);
        countBadge.position.set(slotX + 24, slotY - 24);
        countBadge.visible = false;
        countBadge.eventMode = 'none';

        let shovelCount = 0;

        EventBus.on('gacha:result', (result: any) => {
            if (result.item?.type === 'shovel' || result.type === 'shovel') {
                shovelCount++;
                btn.visible = true;
                btn.eventMode = 'static';
                countBadge.visible = shovelCount > 1;
                countBadge.text = String(shovelCount);
            }
        });

        EventBus.on('shovel:used', () => {
            shovelCount = Math.max(0, shovelCount - 1);
            if (shovelCount === 0) {
                btn.visible = false;
                btn.eventMode = 'none';
                countBadge.visible = false;
            } else {
                countBadge.text = String(shovelCount);
            }
        });

        btn.on('pointerdown', () => {
            btn.width = 56;
            btn.height = 56;
        });
        
        btn.on('pointerup', () => {
            btn.width = 64;
            btn.height = 64;
        });
        btn.on('pointerupoutside', () => {
            btn.width = 64;
            btn.height = 64;
        });

        InputManager.getInstance().bindShovelButton(btn);

        this.shovelToolContainer.addChild(btn);
        this.shovelToolContainer.addChild(countBadge);
    }

    public showLobby(onStart: () => void) {
        // 改为通过 UIManager 推入 LobbyPanel，由 React 层渲染大厅并等待玩家点击开始
        UIManager.getInstance().push({
            panelId: 'LobbyPanel',
            isModal: true,
            props: { onStart }
        });
    }

    public showGameOver(onRestart: () => void, onBackToLobby: () => void) {
        const gameOverPanel = new GameOverPanel(
            () => {
                this.overlayLayer.removeChild(gameOverPanel);
                this.overlayLayer.eventMode = 'none';
                onRestart();
            },
            () => {
                this.overlayLayer.removeChild(gameOverPanel);
                this.overlayLayer.eventMode = 'none';
                onBackToLobby();
            }
        );
        gameOverPanel.zIndex = 10000;
        this.overlayLayer.addChild(gameOverPanel);
        this.overlayLayer.eventMode = 'static';
    }
}
