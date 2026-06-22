import { NineSlicePlane, Text, TextStyle, Sprite, Assets, Container, Graphics } from 'pixi.js';
import { InputManager } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';

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
        // 参数为纹理四周不受拉伸影响的区域 (左, 上, 右, 下) 的像素尺寸
        const topBar = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        topBar.width = 800;
        topBar.height = 80;
        topBar.position.set(0, 0);
        this.view.addChild(topBar);

        // 顶部灵石 UI
        const stonesText = new Text('', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x00FFFF,
            fontWeight: 'bold'
        });
        stonesText.x = 20;
        stonesText.y = 20;
        this.view.addChild(stonesText);

        GameState.getInstance().onStateChanged((stones, health, maxHealth) => {
            stonesText.text = `灵石: ${stones} | 生命: ${health}/${maxHealth}`;
        });
    }

    // 构建带 Yoyo 缩放缓动反馈的“聚灵”按钮
    private createJuLingButton() {
        // 这里复用了底图，实际开发时可替换为按钮专属贴图
        const btn = new Sprite(Assets.get('uiPanel'));
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
        const cooldownOverlay = new Graphics();
        cooldownOverlay.beginFill(0x000000, 0.5);
        cooldownOverlay.drawRect(-btn.width/2, -btn.height/2, btn.width, btn.height);
        cooldownOverlay.endFill();
        cooldownOverlay.visible = false;
        btn.addChild(cooldownOverlay);

        btn.on('pointerdown', (e) => {
            e.stopPropagation();
            if (isOnCooldown) return;

            btn.scale.set(0.9);
            
            // 触发抽卡请求
            EventBus.emit('gacha:request', { amount: 1 });

            // 开始 1秒 冷却
            isOnCooldown = true;
            cooldownOverlay.visible = true;
            
            let cooldownTime = 1000;
            const startTime = performance.now();
            
            const animateCooldown = () => {
                const elapsed = performance.now() - startTime;
                if (elapsed >= cooldownTime) {
                    isOnCooldown = false;
                    cooldownOverlay.visible = false;
                } else {
                    const ratio = 1 - (elapsed / cooldownTime);
                    cooldownOverlay.clear();
                    cooldownOverlay.beginFill(0x000000, 0.5);
                    cooldownOverlay.drawRect(-btn.width/2, -btn.height/2, btn.width * ratio, btn.height);
                    cooldownOverlay.endFill();
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
        overlay.beginFill(0x000000, 0.8);
        overlay.drawRect(0, 0, 800, 600);
        overlay.endFill();
        overlay.eventMode = 'static';

        const title = new Text('仙侠塔防', TextStyles.Title);
        title.anchor.set(0.5);
        title.position.set(400, 200);
        overlay.addChild(title);

        const btn = new Sprite(Assets.get('uiPanel'));
        btn.anchor.set(0.5);
        btn.position.set(400, 400);
        btn.eventMode = 'static';
        btn.cursor = 'pointer';

        const label = new Text('开始闯关', { fontSize: 20, fill: 0xFFFFFF });
        label.anchor.set(0.5);
        btn.addChild(label);

        btn.on('pointerdown', () => {
            this.view.removeChild(overlay);
            onStart();
        });

        overlay.addChild(btn);
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
