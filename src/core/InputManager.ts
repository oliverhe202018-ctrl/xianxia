import { Container, Sprite, FederatedPointerEvent, Assets, Text } from 'pixi.js';
import { GameState } from './GameState';
import { MAP_GRID } from '../config/MapConfig';
import { GachaSystem } from '../systems/GachaSystem';
import { UserStore } from '../store/UserStore';

export enum InteractionState {
    IDLE = 'IDLE',
    DRAGGING = 'DRAGGING',
    SHOVELING = 'SHOVELING'
}

export class InputManager {
    private static instance: InputManager;
    public currentState: InteractionState = InteractionState.IDLE;
    
    public dragLayer: Container = new Container();
    
    private constructor() {}

    public static getInstance(): InputManager {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }

    public setState(newState: InteractionState) {
        this.currentState = newState;
        
        if (newState === InteractionState.SHOVELING) {
            document.body.style.cursor = 'url(assets/shovel.png), crosshair';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    public bindShovelButton(shovelBtn: Sprite) {
        shovelBtn.eventMode = 'static';
        shovelBtn.on('pointerdown', (e: FederatedPointerEvent) => {
            e.stopPropagation();
            
            if (this.currentState === InteractionState.SHOVELING) {
                this.setState(InteractionState.IDLE);
            } else {
                this.setState(InteractionState.SHOVELING);
            }
        });
    }

    public onMapTileClicked(e: FederatedPointerEvent, row: number, col: number, tileSprite: Sprite) {
        e.stopPropagation(); 

        if (this.currentState === InteractionState.SHOVELING) {
            const cellType = MAP_GRID[row][col];
            
            if (cellType === 2) {
                const gameState = GameState.getInstance();
                
                if (gameState.spendStones(5)) {
                    MAP_GRID[row][col] = 0; 
                    
                    this.playShatterEffect(tileSprite);
                    tileSprite.texture = Assets.get('grass');

                    if (Math.random() > 0.5) {
                        gameState.addStones(20);
                        console.log('清障成功，发现了一处微型灵矿，获得 20 灵石！');
                    } else {
                        console.log('清障成功！');
                    }
                    
                    this.setState(InteractionState.IDLE);
                } else {
                    console.warn('灵石不足，无法驱动灵铲！');
                    this.setState(InteractionState.IDLE);
                }
            } else {
                console.log('该地块不包含障碍物');
                this.setState(InteractionState.IDLE);
            }
        }
    }

    private playShatterEffect(target: Sprite) {
        console.log(`[FX] 播放特效：坐标 (${target.x}, ${target.y}) 处的巨石碎裂为齑粉！`);
    }
}
