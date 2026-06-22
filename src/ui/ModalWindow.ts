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
        
        // 1. 半透明黑色遮罩 (拦截点击)
        this.overlay = new Graphics();
        this.overlay.beginFill(0x000000, 0.8);
        this.overlay.drawRect(-2000, -2000, 5000, 5000); // 确保覆盖全部画布
        this.overlay.endFill();
        this.overlay.eventMode = 'static';
        this.addChild(this.overlay);

        // 2. 修仙风格边框主面板
        this.panel = new NineSlicePlane(Assets.get('uiPanel'), 20, 20, 20, 20);
        this.panel.width = width;
        this.panel.height = height;
        this.panel.position.set(
            (GAME.WIDTH - width) / 2,
            (GAME.HEIGHT - height) / 2
        );
        this.panel.eventMode = 'static';
        this.addChild(this.panel);

        // 3. 标题
        this.titleText = new Text(title, TextStyles.Title);
        this.titleText.anchor.set(0.5);
        this.titleText.position.set(width / 2, 40);
        this.panel.addChild(this.titleText);

        // 4. 内容容器
        this.content = new Container();
        this.content.position.set(0, 80);
        this.panel.addChild(this.content);

        // 5. 右上角关闭按钮
        this.closeBtn = new Sprite(Assets.get('uiPanel'));
        this.closeBtn.width = 40;
        this.closeBtn.height = 40;
        this.closeBtn.anchor.set(0.5);
        this.closeBtn.position.set(width - 20, 20);
        this.closeBtn.eventMode = 'static';
        this.closeBtn.cursor = 'pointer';
        
        const closeIcon = new Text('X', { fontSize: 24, fill: 0xffffff, fontWeight: 'bold' });
        closeIcon.anchor.set(0.5);
        this.closeBtn.addChild(closeIcon);

        this.closeBtn.on('pointerdown', () => {
            this.closeBtn.scale.set(0.9);
        });
        
        this.closeBtn.on('pointerup', () => { 
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
