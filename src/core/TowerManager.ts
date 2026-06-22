import { Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import { TowerEntity } from '../components';
import { MAP_GRID, TILE_SIZE } from '../config/MapConfig';
import { GAME } from '../config/game';
import { GameState } from './GameState';
import { UserStore } from '../store/UserStore';

const CHARS = ['剑', '火', '水', '雷', '风'];

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

        // 绘制聚灵按钮
        const btnWidth = 80;
        const btnHeight = 40;
        const btn = new Graphics();
        btn.beginFill(0x4CAF50);
        btn.drawRoundedRect(0, 0, btnWidth, btnHeight, 10);
        btn.endFill();

        btn.x = GAME.WIDTH - btnWidth - 20;
        btn.y = GAME.HEIGHT - btnHeight - 20;

        btn.eventMode = 'static';
        btn.cursor = 'pointer';
        btn.on('pointerdown', () => this.spawnRandomTower());

        const btnText = new Text('聚灵(10)', {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xFFFFFF,
            fontWeight: 'bold'
        });
        btnText.x = btnWidth / 2 - btnText.width / 2;
        btnText.y = btnHeight / 2 - btnText.height / 2;
        btn.addChild(btnText);
        this.uiContainer.addChild(btn);

        // 顶部灵石 UI
        const stonesText = new Text('', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x00FFFF,
            fontWeight: 'bold'
        });
        stonesText.x = 20;
        stonesText.y = 20;
        this.uiContainer.addChild(stonesText);

        GameState.getInstance().onStonesChanged((stones) => {
            stonesText.text = `灵石: ${stones}`;
        });
    }

    // 抽卡核心逻辑
    private drawRank(): number {
        const isVip = UserStore.getInstance().getIsVip();
        
        // 基础权重配置 (1阶, 2阶, 3阶, 4阶)
        let weights = [70, 20, 8, 2];

        // VIP 特权：3阶、4阶抽取权重提升 20%
        if (isVip) {
            weights[2] = weights[2] * 1.2;
            weights[3] = weights[3] * 1.2;
            // 重新归一化 (可选，这里简单按总量随机)
        }

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            rand -= weights[i];
            if (rand <= 0) {
                return i + 1; // 返回阶数 (1-4)
            }
        }
        return 1;
    }

    public spawnRandomTower() {
        const emptyIndex = this.slots.findIndex(slot => slot === null);
        if (emptyIndex === -1) {
            console.log("备战槽已满！");
            return;
        }

        if (!GameState.getInstance().spendStones(10)) {
            console.log("灵石不足！");
            return;
        }

        const charName = CHARS[Math.floor(Math.random() * CHARS.length)];
        const rank = this.drawRank(); // 使用含 VIP 加成的抽卡概率
        
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
            lastAttackTime: 0
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

        const text = new Text(`${charName}${rank}`, {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 0xFFFFFF,
            fontWeight: 'bold'
        });
        text.anchor.set(0.5);
        view.addChild(text);

        // 初始化视觉表现
        this.updateTowerBg(bg, vipGlow, rank, isVip);
        
        bg.x = -SLOT_SIZE / 2;
        bg.y = -SLOT_SIZE / 2;
        
        return { view, bg, text };
    }

    private updateTowerVisual(tower: TowerEntity) {
        const isVip = UserStore.getInstance().getIsVip();
        const vipGlow = tower.view.children[0] as Graphics;
        const bg = tower.view.children[1] as Graphics;
        const text = tower.view.children[2] as Text;
        
        this.updateTowerBg(bg, vipGlow, tower.rank, isVip);
        text.text = `${tower.charName}${tower.rank}`;
    }

    private updateTowerBg(bg: Graphics, vipGlow: Graphics, rank: number, isVip: boolean) {
        // VIP 金色发光效果
        vipGlow.clear();
        if (isVip) {
            vipGlow.beginFill(0xFFD700, 0.4); // 半透明金色
            // 做一个比本体稍大一点的边缘发光
            vipGlow.drawRect(-SLOT_SIZE / 2 - 4, -SLOT_SIZE / 2 - 4, SLOT_SIZE + 8, SLOT_SIZE + 8);
            vipGlow.endFill();
        }

        // 基础塔颜色
        bg.clear();
        const colors = [0x555555, 0x1E90FF, 0x8A2BE2, 0xFFD700, 0xFF4500]; 
        const color = colors[Math.min(rank - 1, colors.length - 1)];
        bg.beginFill(color);
        bg.lineStyle(2, 0xFFFFFF);
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
