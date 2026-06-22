import { NineSlicePlane, Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { UICoordSystem } from '../utils/UICoordSystem';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { WelfarePanel, SignState } from './panels/WelfarePanel';
import { DailyQuestPanel } from './panels/DailyQuestPanel';
import { SecretRealmPanel } from './panels/SecretRealmPanel';

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

    constructor() {
        this.createTopBar();
        this.createJuLingButton();
        this.createShovelButton();
    }

    // 构建顶部状态栏/底部备战槽
    private createTopBar() {
        // 为状态栏设计清晰的卷轴背景贴图占位 (复用 uiPanel 模拟大理石/玉石边框)
        const topBar = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        topBar.width = 300;
        topBar.height = 60;
        
        // 使用 UICoordSystem 将其整体移动到屏幕的右侧顶部区域
        const pos = UICoordSystem.getTopRight(310, 10);
        topBar.position.set(pos.x, pos.y);
        this.view.addChild(topBar);

        // 顶部灵石 UI
        const stonesText = new Text('', {
            fontFamily: ['"Microsoft YaHei"', 'sans-serif'],
            fontSize: 20,
            fill: 0xDAA520, // 金色
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 2
        });
        stonesText.anchor.set(0.5);
        stonesText.position.set(pos.x + topBar.width / 2, pos.y + topBar.height / 2);
        this.view.addChild(stonesText);

        GameState.getInstance().onStateChanged((stones, health, maxHealth) => {
            stonesText.text = `灵石: ${stones} | 生命: ${health}/${maxHealth}`;
        });
    }

    // 构建带 Yoyo 缩放缓动反馈的“聚灵”按钮
    private createJuLingButton() {
        // 这里复用了底图，实际开发时可替换为按钮专属贴图
        const btn = new Sprite(Assets.get('uiPanel'));
        btn.width = 120;
        btn.height = 50;
        btn.anchor.set(0.5);
        btn.position.set(400, 500);
        
        const label = new Text('聚灵', TextStyles.Title);
        label.anchor.set(0.5);
        btn.addChild(label);

        // 交互参数配置
        btn.interactive = true;
        btn.cursor = 'pointer';

        // 简易 Yoyo 缓动占位：按下即收缩，松开或滑出即回弹
        let isOnCooldown = false;
        
        // 冷却进度条遮罩
        const cooldownRing = new Graphics();
        cooldownRing.visible = false;
        btn.addChild(cooldownRing);

        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            if (isOnCooldown) return;

            btn.scale.set(0.9);
            
            // 触发抽卡请求
            EventBus.emit('gacha:request', { amount: 1 });

            // 开始 1秒 冷却
            isOnCooldown = true;
            cooldownRing.visible = true;
            
            let cooldownTime = 1000;
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
        
        this.view.addChild(btn);
    }

    private createShovelButton() {
        const btn = new Sprite(Assets.get('shovel'));
        btn.anchor.set(0.5);
        btn.position.set(700, 500); // 放在右下角
        btn.width = 64;
        btn.height = 64;
        
        btn.eventMode = 'static';
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

        this.view.addChild(btn);
    }

    public showLobby(onStart: () => void) {
        const overlay = new Graphics();
        // 彻底遮盖全屏，防泄漏，调整层级到最高
        overlay.beginFill(0x000000, 0.85);
        overlay.drawRect(-2000, -2000, 5000, 5000);
        overlay.endFill();
        overlay.eventMode = 'static';
        overlay.zIndex = 9999;

        // 新的大理石边框大厅界面
        const marbleBorder = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        marbleBorder.width = 500;
        marbleBorder.height = 400;
        marbleBorder.position.set(150, 100);
        overlay.addChild(marbleBorder);

        // 裁剪区域 (Clipping Mask)，确保内容不漏出大理石边框下方
        const mask = new Graphics();
        mask.beginFill(0xFFFFFF);
        mask.drawRect(150, 100, 500, 400);
        mask.endFill();
        marbleBorder.mask = mask;
        overlay.addChild(mask);

        const title = new Text('仙侠塔防', TextStyles.Title);
        title.anchor.set(0.5);
        title.position.set(400, 180);
        overlay.addChild(title);

        const btn = new Sprite(Assets.get('uiPanel'));
        btn.anchor.set(0.5);
        btn.position.set(400, 400);
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const label = new Text('开始闯关', { fontSize: 22, fill: 0xFFFFFF, fontWeight: 'bold' });
        label.anchor.set(0.5);
        btn.addChild(label);

        btn.on('pointerdown', () => {
            this.view.removeChild(overlay);
            onStart();
        });

        overlay.addChild(btn);

        // --- 新增：玩法和活动入口 (垂直列表，置于大理石边框右侧区域) ---
        const eventNames = ['每日活动', '限时秘境', '斗法大会', '福利'];
        const startY = 160;
        const btnHeight = 45;
        const spacing = 15;

        eventNames.forEach((name, index) => {
            // 使用玉石背景样式 (复用 uiPanel)
            const eventBtn = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
            eventBtn.width = 140;
            eventBtn.height = btnHeight;
            // 定位在中心偏右
            eventBtn.position.set(480, startY + index * (btnHeight + spacing));
            eventBtn.eventMode = 'static';
            eventBtn.cursor = 'pointer';

            const eventLabel = new Text(name, { 
                fontFamily: ['"Microsoft YaHei"', 'sans-serif'], 
                fontSize: 18, 
                fill: 0xDAA520, // 金色字体
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowDistance: 1
            });
            eventLabel.anchor.set(0.5);
            eventLabel.position.set(eventBtn.width / 2, eventBtn.height / 2);
            eventBtn.addChild(eventLabel);

            // 绑定交互事件
            eventBtn.on('pointerdown', () => {
                if (name === '福利') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    
                    // 模拟玩家的7日签到数据
                    const mockData = [
                        { day: 1, state: SignState.SIGNED, rewardDesc: '灵石x100' },
                        { day: 2, state: SignState.AVAILABLE, rewardDesc: '灵石x200' },
                        { day: 3, state: SignState.LOCKED, rewardDesc: '灵石x300' },
                        { day: 4, state: SignState.LOCKED, rewardDesc: '无字天书x1' },
                        { day: 5, state: SignState.LOCKED, rewardDesc: '灵石x500' },
                        { day: 6, state: SignState.LOCKED, rewardDesc: '灵石x600' },
                        { day: 7, state: SignState.LOCKED, rewardDesc: '无字天书x3' }
                    ];

                    const welfarePanel = new WelfarePanel(mockData, () => {
                        console.log('福利面板已关闭');
                    });
                    
                    welfarePanel.zIndex = 10000; // 确保在 lobby overlay (9999) 之上
                    
                    welfarePanel.zIndex = 10000;
                    this.view.addChild(welfarePanel);
                } else if (name === '每日活动') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    const dailyPanel = new DailyQuestPanel(() => console.log('每日活动面板已关闭'));
                    dailyPanel.zIndex = 10000;
                    this.view.addChild(dailyPanel);
                } else if (name === '限时秘境') {
                    console.log(`[大厅入口点击]: 弹出${name}面板`);
                    const puzzlePanel = new SecretRealmPanel(() => console.log('限时秘境面板已关闭'));
                    puzzlePanel.zIndex = 10000;
                    this.view.addChild(puzzlePanel);
                } else {
                    console.log(`[大厅入口点击]: ${name}`);
                }
            });

            // 添加缩小点击反馈
            eventBtn.on('pointerdown', () => { eventBtn.scale.set(0.95); });
            eventBtn.on('pointerup', () => { eventBtn.scale.set(1); });
            eventBtn.on('pointerupoutside', () => { eventBtn.scale.set(1); });

            overlay.addChild(eventBtn);
        });
        // -------------------------------------------------------------

        
        // 确保容器开启了排序
        this.view.sortableChildren = true;
        this.view.addChild(overlay);
    }

    public showGameOver(onRestart: () => void) {
        const overlay = new Graphics();
        overlay.beginFill(0x4a0000, 0.8);
        overlay.drawRect(0, 0, 800, 600);
        overlay.endFill();
        overlay.eventMode = 'static';

        const title = new Text('道死身消', { ...TextStyles.Title, fill: '#FF0000' } as any);
        title.anchor.set(0.5);
        title.position.set(400, 200);
        overlay.addChild(title);

        const btn = new Sprite(Assets.get('uiPanel'));
        btn.anchor.set(0.5);
        btn.position.set(400, 400);
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const label = new Text('重新来过', { fontSize: 20, fill: 0xFFFFFF });
        label.anchor.set(0.5);
        btn.addChild(label);

        btn.on('pointerdown', () => {
            this.view.removeChild(overlay);
            onRestart();
        });

        overlay.addChild(btn);
        this.view.addChild(overlay);
    }
}
