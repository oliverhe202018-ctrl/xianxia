import { NineSlicePlane, Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { UICoordSystem } from '../utils/UICoordSystem';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { WelfarePanel, SignState } from './panels/WelfarePanel';
import { DailyQuestPanel } from './panels/DailyQuestPanel';
import { SecretRealmPanel } from './panels/SecretRealmPanel';
import { GameOverPanel } from './panels/GameOverPanel';

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

    constructor() {
        this.view.name = 'GameUIRoot';
        this.mainUILayer.name = 'MainUILayer';
        this.statusBarContainer.name = 'StatusBarLayer';
        this.gatherSpiritButtonContainer.name = 'GatherSpiritButtonLayer';
        this.shovelToolContainer.name = 'ShovelButtonLayer';
        this.bottomNavigationContainer.name = 'BottomNavigationLayer';

        // 根容器绝不参与 hit test，避免全屏 UI 容器抢事件
        this.view.eventMode = 'none';
        this.view.interactive = false;
        (this.view as any).hitArea = null;

        // 纯装饰层绝不参与交互
        this.mainUILayer.eventMode = 'none';
        this.mainUILayer.interactive = false;
        (this.mainUILayer as any).hitArea = null;
        this.view.addChild(this.mainUILayer);

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
        btn.position.set(400, 500);

        // 按钮文案从按钮 Sprite 内剥离，避免文案成为边框/按钮子树中的命中歧义节点
        const label = new Text('聚灵', TextStyles.Title);
        label.name = 'GatherSpiritButtonLabel';
        label.anchor.set(0.5);
        label.position.set(btn.x, btn.y);
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
        btn.position.set(700, 500);
        btn.width = 64;
        btn.height = 64;
        
        btn.eventMode = 'static';
        btn.interactive = true;
        btn.cursor = 'pointer';

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
    }

    public showLobby(onStart: () => void) {
        const overlay = new Graphics();
        overlay.name = 'LobbyOverlay';
        overlay.beginFill(0x000000, 0.85);
        overlay.drawRect(-2000, -2000, 5000, 5000);
        overlay.endFill();
        overlay.eventMode = 'static';
        overlay.zIndex = 9999;

        const marbleBorder = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        marbleBorder.name = 'LobbyMarbleFrame';
        marbleBorder.width = 500;
        marbleBorder.height = 400;
        marbleBorder.position.set(150, 100);
        marbleBorder.eventMode = 'none';
        marbleBorder.interactive = false;
        (marbleBorder as any).hitArea = null;
        overlay.addChild(marbleBorder);

        const mask = new Graphics();
        mask.name = 'LobbyMarbleFrameMask';
        mask.beginFill(0xFFFFFF);
        mask.drawRect(150, 100, 500, 400);
        mask.endFill();
        mask.eventMode = 'none';
        mask.interactive = false;
        (mask as any).hitArea = null;
        marbleBorder.mask = mask;
        overlay.addChild(mask);

        const title = new Text('仙侠塔防', TextStyles.Title);
        title.name = 'LobbyTitle';
        title.anchor.set(0.5);
        title.position.set(400, 180);
        title.eventMode = 'none';
        overlay.addChild(title);

        const btn = new Sprite(Assets.get('uiPanel'));
        btn.name = 'LobbyStartButton';
        btn.anchor.set(0.5);
        btn.position.set(400, 400);
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const label = new Text('开始闯关', { fontSize: 22, fill: 0xFFFFFF, fontWeight: 'bold' });
        label.name = 'LobbyStartButtonLabel';
        label.anchor.set(0.5);
        label.eventMode = 'none';
        btn.addChild(label);

        btn.on('pointerdown', () => {
            this.view.removeChild(overlay);
            onStart();
        });

        overlay.addChild(btn);

        const eventNames = ['每日活动', '限时秘境', '斗法大会', '福利'];
        const startY = 160;
        const btnHeight = 45;
        const spacing = 15;

        const mockData = [
            { day: 1, state: SignState.SIGNED, rewardDesc: '灵石x100' },
            { day: 2, state: SignState.AVAILABLE, rewardDesc: '灵石x200' },
            { day: 3, state: SignState.LOCKED, rewardDesc: '灵石x300' },
            { day: 4, state: SignState.LOCKED, rewardDesc: '无字天书x1' },
            { day: 5, state: SignState.LOCKED, rewardDesc: '灵石x500' },
            { day: 6, state: SignState.LOCKED, rewardDesc: '灵石x600' },
            { day: 7, state: SignState.LOCKED, rewardDesc: '无字天书x3' }
        ];
        const welfarePanel = new WelfarePanel(mockData);
        welfarePanel.zIndex = 10000;
        welfarePanel.visible = false;
        this.view.addChild(welfarePanel);

        const dailyPanel = new DailyQuestPanel();
        dailyPanel.zIndex = 10000;
        dailyPanel.visible = false;
        this.view.addChild(dailyPanel);

        const puzzlePanel = new SecretRealmPanel();
        puzzlePanel.zIndex = 10000;
        puzzlePanel.visible = false;
        this.view.addChild(puzzlePanel);

        eventNames.forEach((name, index) => {
            const eventBtn = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
            eventBtn.name = `LobbyEventButton:${name}`;
            eventBtn.width = 140;
            eventBtn.height = btnHeight;
            eventBtn.position.set(480, startY + index * (btnHeight + spacing));
            eventBtn.eventMode = 'static';
            eventBtn.cursor = 'pointer';

            const eventLabel = new Text(name, { 
                fontFamily: ['"Microsoft YaHei"', 'sans-serif'], 
                fontSize: 18, 
                fill: 0xDAA520,
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowDistance: 1
            });
            eventLabel.name = `LobbyEventButtonLabel:${name}`;
            eventLabel.anchor.set(0.5);
            eventLabel.position.set(eventBtn.width / 2, eventBtn.height / 2);
            eventLabel.eventMode = 'none';
            eventBtn.addChild(eventLabel);

            eventBtn.on('pointerdown', () => {
                if (name === '福利') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    welfarePanel.visible = true;
                } else if (name === '每日活动') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    dailyPanel.visible = true;
                } else if (name === '限时秘境') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    puzzlePanel.visible = true;
                } else {
                    console.log(`[大厅入口点击]: ${name}`);
                }
            });

            eventBtn.on('pointerdown', () => { eventBtn.scale.set(0.95); });
            eventBtn.on('pointerup', () => { eventBtn.scale.set(1); });
            eventBtn.on('pointerupoutside', () => { eventBtn.scale.set(1); });

            overlay.addChild(eventBtn);
        });

        this.view.sortableChildren = true;
        this.view.addChild(overlay);
    }

    public showGameOver(onRestart: () => void, onBackToLobby: () => void) {
        const gameOverPanel = new GameOverPanel(
            () => {
                this.view.removeChild(gameOverPanel);
                onRestart();
            },
            () => {
                this.view.removeChild(gameOverPanel);
                onBackToLobby();
            }
        );
        gameOverPanel.zIndex = 10000;
        this.view.addChild(gameOverPanel);
    }
}
