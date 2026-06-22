import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js';
import { ModalWindow } from '../ModalWindow';
import { TaskManager, TaskState } from '../../systems/TaskManager';
import { DailyTasks } from '../../config/TaskConfig';
import { EventBus } from '../../core/EventBus';

export class DailyQuestPanel extends ModalWindow {
    private listContainer: Container;

    constructor(onClose?: () => void) {
        super('每日活动', 600, 450, onClose);
        
        this.listContainer = new Container();
        this.listContainer.position.set(40, 20);
        this.content.addChild(this.listContainer);

        this.renderList();

        EventBus.on('task:updated', this.handleTaskUpdate);
    }

    private handleTaskUpdate = () => {
        this.renderList();
    };

    private renderList() {
        this.listContainer.removeChildren();

        const tm = TaskManager.getInstance();
        const startY = 0;
        const gap = 80;

        DailyTasks.forEach((task, index) => {
            const { progress, state } = tm.getTaskProgress(task.id);

            const row = new Container();
            row.position.set(0, startY + index * gap);

            // 背景底框
            const bg = new Graphics();
            bg.beginFill(0x2a2a2a, 0.8);
            bg.lineStyle(1, 0x555555);
            bg.drawRoundedRect(0, 0, 520, 70, 8);
            bg.endFill();
            row.addChild(bg);

            // 任务名 & 描述
            const title = new Text(task.name, { fontSize: 20, fill: 0xd4af37, fontWeight: 'bold' });
            title.position.set(20, 10);
            row.addChild(title);

            const desc = new Text(`${task.desc} (奖励: ${task.rewardDesc})`, { fontSize: 16, fill: 0xcccccc });
            desc.position.set(20, 40);
            row.addChild(desc);

            // 进度文字
            const progressText = new Text(`${progress}/${task.targetValue}`, { fontSize: 18, fill: progress >= task.targetValue ? 0x00ff00 : 0xffffff });
            progressText.anchor.set(1, 0.5);
            progressText.position.set(380, 35);
            row.addChild(progressText);

            // 领取按钮
            const btn = new Graphics();
            const btnLabel = new Text('', { fontSize: 18, fill: 0xffffff, fontWeight: 'bold' });
            btnLabel.anchor.set(0.5);

            if (state === TaskState.CLAIMED) {
                btn.beginFill(0x555555);
                btn.drawRoundedRect(0, 0, 100, 40, 5);
                btnLabel.text = '已领取';
            } else if (state === TaskState.AVAILABLE) {
                btn.beginFill(0x00aa00);
                btn.drawRoundedRect(0, 0, 100, 40, 5);
                btnLabel.text = '领取';
                btn.eventMode = 'static';
                btn.cursor = 'pointer';
                btn.on('pointerdown', () => {
                    if (tm.claimReward(task.id)) {
                        // 发放奖励（实际应通过 EventBus 抛出奖励发放请求）
                        console.log(`发放奖励: ${task.rewardDesc}`);
                    }
                });
            } else {
                btn.beginFill(0x888888);
                btn.drawRoundedRect(0, 0, 100, 40, 5);
                btnLabel.text = '未完成';
            }

            btn.position.set(400, 15);
            btnLabel.position.set(50, 20);
            btn.addChild(btnLabel);
            row.addChild(btn);

            this.listContainer.addChild(row);
        });
    }

    public destroy(options?: any) {
        EventBus.off('task:updated', this.handleTaskUpdate);
        super.destroy(options);
    }
}
