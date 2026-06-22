import { Container, Graphics, Text } from 'pixi.js';
import { ModalWindow } from '../ModalWindow';
import { PuzzleConfigs } from '../../config/PuzzleConfig';
import { GameModeAdapter } from '../../systems/GameModeAdapter';

export class SecretRealmPanel extends ModalWindow {
    private listContainer: Container;

    constructor(onClose?: () => void) {
        super('限时秘境', 700, 500, onClose);
        
        this.listContainer = new Container();
        this.listContainer.position.set(40, 20);
        this.content.addChild(this.listContainer);

        this.renderList();
    }

    private renderList() {
        const startY = 0;
        const gap = 120;

        PuzzleConfigs.forEach((puzzle, index) => {
            const row = new Container();
            row.position.set(0, startY + index * gap);

            // 背景
            const bg = new Graphics();
            bg.beginFill(0x111122, 0.9);
            bg.lineStyle(2, 0x8800ff); // 神秘紫色边框
            bg.drawRoundedRect(0, 0, 620, 100, 10);
            bg.endFill();
            row.addChild(bg);

            // 标题
            const title = new Text(puzzle.name, { fontSize: 24, fill: 0xcc88ff, fontWeight: 'bold' });
            title.position.set(20, 15);
            row.addChild(title);

            // 描述 (自动换行)
            const desc = new Text(puzzle.desc, { 
                fontSize: 14, 
                fill: 0xaaaaaa, 
                wordWrap: true, 
                wordWrapWidth: 460 
            });
            desc.position.set(20, 45);
            row.addChild(desc);

            // 进入按钮
            const btn = new Graphics();
            btn.beginFill(0x5500aa);
            btn.drawRoundedRect(0, 0, 100, 40, 5);
            btn.position.set(500, 30);
            btn.eventMode = 'static';
            btn.cursor = 'pointer';

            const btnLabel = new Text('进入残局', { fontSize: 16, fill: 0xffffff, fontWeight: 'bold' });
            btnLabel.anchor.set(0.5);
            btnLabel.position.set(50, 20);
            btn.addChild(btnLabel);

            btn.on('pointerdown', () => {
                GameModeAdapter.getInstance().enterPuzzleMode(puzzle.id);
                this.destroy({ children: true });
                // 在此处可以通过 EventBus 或其他方式关闭整个大厅，直接开始游戏
                console.log(`[秘境面板] 选择进入: ${puzzle.name}`);
            });

            // 交互动效
            btn.on('pointerdown', () => btn.scale.set(0.95));
            btn.on('pointerup', () => btn.scale.set(1));
            btn.on('pointerupoutside', () => btn.scale.set(1));

            row.addChild(btn);
            this.listContainer.addChild(row);
        });
    }
}
