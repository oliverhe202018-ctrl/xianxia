import { Container, Graphics, NineSlicePlane, Assets, Text, Sprite } from 'pixi.js';
import { TextStyles } from './GameUI';
import { GAME } from '../config/game';

export class ModalWindow extends Container {
    protected overlay: Graphics;
    protected panel: NineSlicePlane;
    protected titleText: Text;
    protected closeBtn: Sprite;
    public content: Container;

    constructor(title: string, width: number = 600, height: number = 400, onClose?: () => void) {
        super();

        // 1. 半透明黑色遮罩
        // ★ overlay 职责：阻止点击穿透到地图，保持 'static'，
        //   但 stopPropagation 避免它触发地图逻辑
        this.overlay = new Graphics();
        this.overlay.name = 'ModalOverlay';
        this.overlay.beginFill(0x000000, 0.8);
        this.overlay.drawRect(-2000, -2000, 5000, 5000);
        this.overlay.endFill();
        this.overlay.eventMode = 'static';
        this.overlay.on('pointerdown', (e) => { e.stopPropagation(); });
        this.addChild(this.overlay);

        // 2. 修仙风格边框面板
        // ★ 修复：panel (NineSlicePlane) 从 'static' 降为 'passive'
        //   'passive'：接受来自子节点冒泡的事件，但自身不主动触发 hit test
        //   解决：面板背景 bounds 覆盖了内部按钮区域，导致 panel 先命中、按钮命中失败
        this.panel = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        this.panel.name = 'ModalPanel';
        this.panel.width = width;
        this.panel.height = height;
        this.panel.position.set(
            (GAME.WIDTH - width) / 2,
            (GAME.HEIGHT - height) / 2
        );
        this.panel.eventMode = 'passive';
        this.panel.hitArea = null as any;
        this.addChild(this.panel);

        // 3. 标题（纯视觉）
        this.titleText = new Text(title, TextStyles.Title);
        this.titleText.name = 'ModalTitle';
        this.titleText.anchor.set(0.5);
        this.titleText.position.set(width / 2, 40);
        this.titleText.eventMode = 'none';
        this.panel.addChild(this.titleText);

        // 4. 内容容器（子节点各自管理 eventMode）
        this.content = new Container();
        this.content.name = 'ModalContent';
        this.content.position.set(0, 80);
        this.content.eventMode = 'passive';
        this.panel.addChild(this.content);

        // 5. 右上角关闭按钮（需要 static）
        this.closeBtn = new Sprite(Assets.get('uiPanel'));
        this.closeBtn.name = 'ModalCloseBtn';
        this.closeBtn.width = 40;
        this.closeBtn.height = 40;
        this.closeBtn.anchor.set(0.5);
        this.closeBtn.position.set(width - 20, 20);
        this.closeBtn.eventMode = 'static';
        this.closeBtn.cursor = 'pointer';

        const closeIcon = new Text('X', { fontSize: 24, fill: 0xffffff, fontWeight: 'bold' });
        closeIcon.anchor.set(0.5);
        closeIcon.eventMode = 'none';
        this.closeBtn.addChild(closeIcon);

        this.closeBtn.on('pointerdown', (e) => {
            e.stopPropagation();
            this.closeBtn.scale.set(0.9);
        });
        this.closeBtn.on('pointerup', (e) => {
            e.stopPropagation();
            this.closeBtn.scale.set(1);
            this.visible = false;
            if (onClose) onClose();
        });
        this.closeBtn.on('pointerupoutside', () => {
            this.closeBtn.scale.set(1);
        });

        this.panel.addChild(this.closeBtn);
    }
}
