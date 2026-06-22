import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js';
import { ModalWindow } from '../ModalWindow';
import { EventBus } from '../../core/EventBus';

export enum SignState {
    LOCKED = 0,    // 未签到 (不可签)
    AVAILABLE = 1, // 可签到
    SIGNED = 2     // 已签到
}

export interface WelfareData {
    day: number;
    state: SignState;
    rewardDesc: string;
}

export class WelfarePanel extends ModalWindow {
    constructor(signData: WelfareData[], onClose?: () => void) {
        super('七日修仙录', 600, 400, onClose);
        this.renderSignGrid(signData);
    }

    private renderSignGrid(signData: WelfareData[]) {
        const startX = 40;
        const startY = 20;
        const gap = 70;

        signData.forEach((data, index) => {
            const grid = new Container();
            grid.position.set(startX + index * gap, startY);

            // 1. 格子背景
            const bg = new Graphics();
            bg.beginFill(0x2a2a2a, 1);
            bg.lineStyle(2, 0xd4af37, 1);
            bg.drawRoundedRect(0, 0, 60, 80, 8);
            bg.endFill();
            grid.addChild(bg);

            // 2. 天数文本
            const dayText = new Text(`第${data.day}天`, { fontSize: 14, fill: 0xffffff });
            dayText.anchor.set(0.5);
            dayText.position.set(30, 15);
            grid.addChild(dayText);

            // 3. 状态图标模拟
            const icon = new Graphics();
            if (data.state === SignState.LOCKED) {
                // 暗色灵石
                icon.beginFill(0x555555);
                icon.drawCircle(30, 45, 15);
            } else if (data.state === SignState.AVAILABLE) {
                // 发光灵石
                icon.beginFill(0x00FFFF);
                icon.drawCircle(30, 45, 15);
                
                // 呼吸灯效果 (简单模拟)
                const glow = new Graphics();
                glow.beginFill(0x00FFFF, 0.4);
                glow.drawCircle(30, 45, 20);
                glow.endFill();
                grid.addChildAt(glow, 1);
            } else if (data.state === SignState.SIGNED) {
                // 已签到 打钩
                icon.lineStyle(4, 0x00FF00);
                icon.moveTo(20, 45);
                icon.lineTo(28, 55);
                icon.lineTo(45, 35);
            }
            icon.endFill();
            grid.addChild(icon);

            // 4. 交互逻辑 (仅在 AVAILABLE 时可点击)
            if (data.state === SignState.AVAILABLE) {
                bg.eventMode = 'static';
                bg.cursor = 'pointer';

                bg.on('pointerdown', () => {
                    // 点击效果
                    grid.scale.set(0.9);
                });
                
                bg.on('pointerup', () => {
                    grid.scale.set(1);
                    this.playClaimAnimation(grid, data.day);
                });
                
                bg.on('pointerupoutside', () => {
                    grid.scale.set(1);
                });
            }

            this.content.addChild(grid);
        });
    }

    private playClaimAnimation(grid: Container, day: number) {
        // 简单弹跳动画后抛出领奖事件
        let scale = 1;
        let growing = true;
        
        const animate = () => {
            if (growing) {
                scale += 0.05;
                if (scale >= 1.2) growing = false;
            } else {
                scale -= 0.05;
                if (scale <= 1) {
                    scale = 1;
                    EventBus.getInstance().emit('welfare:claim', day);
                    // 在真实项目中，应该等待服务端返回后再刷新UI。这里模拟直接刷新当前面板
                    this.destroy({ children: true });
                    return;
                }
            }
            grid.scale.set(scale);
            requestAnimationFrame(animate);
        };
        animate();
    }
}
