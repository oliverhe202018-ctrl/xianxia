import { Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { TowerEntity } from '../components';
import { MAP_GRID, TILE_SIZE } from '../config/MapConfig';
import { GAME } from '../config/game';
import { GameState } from './GameState';
import { UserStore } from '../store/UserStore';
import { EventBus } from './EventBus';
import { StatsCenter } from '../services/StatsCenter';
import { TowerCharName } from '../config/GameConfig';

// UI 配置
const SLOT_COUNT = 5;
const SLOT_SIZE = 50;
const SLOT_GAP = 10;
const SLOT_START_X = (GAME.WIDTH - (SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP)) / 2;
const SLOT_START_Y = GAME.HEIGHT - SLOT_SIZE - 20;

export class TowerManager {
    public container: Container; // 包含所有的塔
    public uiContainer: Container; // 包含 UI 元素

    private towers: TowerEntity[] = [];
    private slots: (TowerEntity | null)[] = Array(SLOT_COUNT).fill(null);
    private gridOccupancy: (TowerEntity | null)[][] = [];

    private nextId: number = 1;

    private draggingTower: TowerEntity | null = null;
    private dragOffset = { x: 0, y: 0 };
    private dragStartPos = { x: 0, y: 0 };
    
    constructor() {
        this.container = new Container();
        this.container.sortableChildren = true;

        this.uiContainer = new Container();
        
        for (let r = 0; r < MAP_GRID.length; r++) {
            this.gridOccupancy[r] = [];
            for (let c = 0; c < MAP_GRID[0].length; c++) {
                this.gridOccupancy[r][c] = null;
            }
        }

        this.initUI();
        EventBus.on('gacha:result', this.handleGachaResult.bind(this));
    }

    private initUI() {
        // 绘制 5 个备战槽
        for (let i = 0; i < SLOT_COUNT; i++) {
            const slotBg = new Graphics();
            slotBg.beginFill(0x333333);
            slotBg.lineStyle(2, 0x555555);
            slotBg.drawRect(0, 0, SLOT_SIZE, SLOT_SIZE);
            slotBg.endFill();
            
            slotBg.x = SLOT_START_X + i * (SLOT_SIZE + SLOT_GAP);
            slotBg.y = SLOT_START_Y;
            this.uiContainer.addChild(slotBg);
        }
    }

    // 抽卡核心逻辑（已迁移至 GachaSystem，通过 EventBus 解耦）

    private handleGachaResult(data: { charName: TowerCharName, rank: number }) {
        const emptyIndex = this.slots.findIndex(slot => slot === null);
        if (emptyIndex === -1) return; // 防御性判断

        const { charName, rank } = data;
        const towerViews = this.createTowerView(charName, rank);
        const view = towerViews.view;
        
        view.x = SLOT_START_X + emptyIndex * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
        view.y = SLOT_START_Y + SLOT_SIZE / 2;
        
        const entity: TowerEntity = {
            id: this.nextId++,
            charName,
            rank,
            isDeployed: false,
            gridX: -1,
            gridY: -1,
            slotIndex: emptyIndex,
            view: view,
            lastAttackTime: 0,
            combatStats: StatsCenter.compute(charName, rank)
        };

        this.slots[emptyIndex] = entity;
        this.towers.push(entity);
        this.container.addChild(view);

        this.bindTowerEvents(entity);
    }

    private createTowerView(charName: string, rank: number) {
        const view = new Container();
        const isVip = UserStore.getInstance().getIsVip();
        
        // 如果是 VIP，添加金色流光底座
        const vipGlow = new Graphics();
        view.addChild(vipGlow);

        const bg = new Graphics();
        view.addChild(bg);

        // 属性 Icon 映射
        const iconMap: Record<string, string> = {
            '雷': '⚡',
            '水': '💧',
            '火': '🔥',
            '风': '🌪️',
            '剑': '⚔️'
        };

        const iconText = new Text(iconMap[charName] || '', {
            fontSize: 14,
        });
        iconText.anchor.set(0.5);
        iconText.y = -10; // 稍微偏上
        view.addChild(iconText);

        const text = new Text(charName, {
            fontFamily: '"Microsoft YaHei", sans-serif',
            fontSize: 20,
            fill: 0x000000, // 黑色文字
            fontWeight: 'bold'
        });
        text.anchor.set(0.5);
        text.y = 5; // 稍微偏下给图标让位
        view.addChild(text);

        const rankText = new Text(`${rank}`, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xFF0000, // 红色等级
            fontWeight: 'bold'
        });
        rankText.anchor.set(1, 0); // 右上角对齐
        rankText.x = SLOT_SIZE / 2 - 2;
        rankText.y = -SLOT_SIZE / 2 + 2;
        view.addChild(rankText);

        // 初始化视觉表现
        this.updateTowerBg(bg, vipGlow, isVip);
        
        bg.x = -SLOT_SIZE / 2;
        bg.y = -SLOT_SIZE / 2;
        
        return { view, bg, text };
    }

    private updateTowerVisual(tower: TowerEntity) {
        const text = tower.view.children[3] as Text;
        const rankText = tower.view.children[4] as Text;
        
        text.text = tower.charName;
        rankText.text = `${tower.rank}`;
    }

    private updateTowerBg(bg: Graphics, vipGlow: Graphics, isVip: boolean) {
        // VIP 金色发光效果
        vipGlow.clear();
        if (isVip) {
            vipGlow.beginFill(0xFFD700, 0.4); // 半透明金色
            vipGlow.drawRect(-SLOT_SIZE / 2 - 4, -SLOT_SIZE / 2 - 4, SLOT_SIZE + 8, SLOT_SIZE + 8);
            vipGlow.endFill();
        }

        // 基础塔底色为白底，加粗边框
        bg.clear();
        bg.beginFill(0xFFFFFF);
        bg.lineStyle(2, 0x000000);
        bg.drawRect(0, 0, SLOT_SIZE, SLOT_SIZE);
        bg.endFill();
    }

    private bindTowerEvents(tower: TowerEntity) {
        tower.view.eventMode = 'static';
        tower.view.cursor = 'pointer';

        tower.view.on('pointerdown', (e: FederatedPointerEvent) => {
            this.draggingTower = tower;
            tower.view.zIndex = 100;
            
            this.dragStartPos.x = tower.view.x;
            this.dragStartPos.y = tower.view.y;
            
            const localPos = e.data.getLocalPosition(tower.view.parent);
            this.dragOffset.x = tower.view.x - localPos.x;
            this.dragOffset.y = tower.view.y - localPos.y;
        });

        tower.view.on('pointermove', (e: FederatedPointerEvent) => {
            if (this.draggingTower === tower) {
                const localPos = e.data.getLocalPosition(tower.view.parent);
                tower.view.x = localPos.x + this.dragOffset.x;
                tower.view.y = localPos.y + this.dragOffset.y;
            }
        });

        const onPointerUp = (e: FederatedPointerEvent) => {
            if (this.draggingTower !== tower) return;
            this.draggingTower = null;
            tower.view.zIndex = 0;

            for (const other of this.towers) {
                if (other === tower) continue;
                
                const dx = tower.view.x - other.view.x;
                const dy = tower.view.y - other.view.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < SLOT_SIZE / 2) {
                    if (other.charName === tower.charName && other.rank === tower.rank) {
                        this.mergeTowers(tower, other);
                        return;
                    }
                }
            }

            const gridC = Math.floor(tower.view.x / TILE_SIZE);
            const gridR = Math.floor(tower.view.y / TILE_SIZE);

            if (gridC >= 0 && gridC < MAP_GRID[0].length && gridR >= 0 && gridR < MAP_GRID.length) {
                const cellType = MAP_GRID[gridR][gridC];
                
                if (cellType === 0) {
                    const existingTower = this.gridOccupancy[gridR][gridC];
                    if (!existingTower) {
                        this.deployTower(tower, gridR, gridC);
                        return;
                    }
                }
            }
            
            this.revertTowerPos(tower);
        };

        tower.view.on('pointerup', onPointerUp);
        tower.view.on('pointerupoutside', onPointerUp);
    }

    private deployTower(tower: TowerEntity, gridR: number, gridC: number) {
        if (tower.isDeployed) {
            this.gridOccupancy[tower.gridY][tower.gridX] = null;
        } else {
            this.slots[tower.slotIndex] = null;
        }

        tower.isDeployed = true;
        tower.gridX = gridC;
        tower.gridY = gridR;
        this.gridOccupancy[gridR][gridC] = tower;

        tower.view.x = gridC * TILE_SIZE + TILE_SIZE / 2;
        tower.view.y = gridR * TILE_SIZE + TILE_SIZE / 2;
    }

    private mergeTowers(source: TowerEntity, target: TowerEntity) {
        this.destroyTower(source);
        target.rank++;
        this.updateTowerVisual(target);
        target.combatStats = StatsCenter.compute(target.charName as TowerCharName, target.rank);
        
        EventBus.emit('tower:merged', { 
            entityId: target.id, 
            charName: target.charName as TowerCharName, 
            newRank: target.rank 
        });
    }

    private revertTowerPos(tower: TowerEntity) {
        tower.view.x = this.dragStartPos.x;
        tower.view.y = this.dragStartPos.y;
    }

    private destroyTower(tower: TowerEntity) {
        if (tower.isDeployed) {
            this.gridOccupancy[tower.gridY][tower.gridX] = null;
        } else {
            this.slots[tower.slotIndex] = null;
        }

        const index = this.towers.indexOf(tower);
        if (index > -1) {
            this.towers.splice(index, 1);
        }

        if (tower.view && tower.view.parent) {
            tower.view.parent.removeChild(tower.view);
        }
        
        tower.view.destroy({ children: true });
    }

    public getDeployedTowers(): TowerEntity[] {
        return this.towers.filter(t => t.isDeployed);
    }
}
