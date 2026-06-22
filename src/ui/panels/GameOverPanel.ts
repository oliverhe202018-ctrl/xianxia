import { ModalWindow } from '../ModalWindow';
import { Text, Sprite, Assets } from 'pixi.js';
import { TextStyles } from '../GameUI';

export class GameOverPanel extends ModalWindow {
    constructor(onRestart: () => void, onBackToLobby: () => void) {
        // 关闭按钮不适用，因此传入undefined并稍后隐藏它
        super('道死身消', 500, 350, undefined);
        
        // 隐藏右上角关闭按钮，因为失败必须通过固定按钮选择
        if (this.closeBtn) {
            this.closeBtn.visible = false;
        }

        this.titleText.style = { ...TextStyles.Title, fill: '#FF0000' } as any;

        // 重新渡劫按钮
        const restartBtn = new Sprite(Assets.get('uiPanel'));
        restartBtn.anchor.set(0.5);
        restartBtn.position.set(this.panel.width / 2 - 100, this.panel.height / 2 + 50);
        restartBtn.width = 140;
        restartBtn.height = 50;
        restartBtn.eventMode = 'static';
        restartBtn.cursor = 'pointer';

        const restartLabel = new Text('重新渡劫', { fontSize: 20, fill: 0xFFFFFF, fontWeight: 'bold' });
        restartLabel.anchor.set(0.5);
        restartBtn.addChild(restartLabel);

        restartBtn.on('pointerdown', () => restartBtn.scale.set(0.9));
        restartBtn.on('pointerup', () => {
            restartBtn.scale.set(1);
            this.visible = false;
            onRestart();
        });
        restartBtn.on('pointerupoutside', () => restartBtn.scale.set(1));

        this.panel.addChild(restartBtn);

        // 返回大厅按钮
        const lobbyBtn = new Sprite(Assets.get('uiPanel'));
        lobbyBtn.anchor.set(0.5);
        lobbyBtn.position.set(this.panel.width / 2 + 100, this.panel.height / 2 + 50);
        lobbyBtn.width = 140;
        lobbyBtn.height = 50;
        lobbyBtn.eventMode = 'static';
        lobbyBtn.cursor = 'pointer';

        const lobbyLabel = new Text('返回大厅', { fontSize: 20, fill: 0xFFFFFF, fontWeight: 'bold' });
        lobbyLabel.anchor.set(0.5);
        lobbyBtn.addChild(lobbyLabel);

        lobbyBtn.on('pointerdown', () => lobbyBtn.scale.set(0.9));
        lobbyBtn.on('pointerup', () => {
            lobbyBtn.scale.set(1);
            this.visible = false;
            onBackToLobby();
        });
        lobbyBtn.on('pointerupoutside', () => lobbyBtn.scale.set(1));

        this.panel.addChild(lobbyBtn);
    }
}
