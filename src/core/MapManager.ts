import { Container, Sprite, Texture, TilingSprite, Assets, Graphics } from 'pixi.js';
import { MAP_GRID, TILE_SIZE } from '../config/MapConfig';
import { GAME } from '../config/game';
import { InputManager } from './InputManager';

export class MapManager {
    public view: Container;
    public bgLayer: Container;
    public bgSprite!: TilingSprite;
    
    private portals: { view: Graphics, type: 'start' | 'end', time: number }[] = [];

    constructor() {
        this.view = new Container();
        this.view.sortableChildren = true;
        this.bgLayer = new Container();
        // 初始不在此调用 renderMap，留给外部基于等级生成
        this.renderMap();
    }

    public generateLevelMap(level: number) {
        // 先清理旧路障
        for (let row = 0; row < MAP_GRID.length; row++) {
            for (let col = 0; col < MAP_GRID[row].length; col++) {
                if (MAP_GRID[row][col] === 2) {
                    MAP_GRID[row][col] = 0;
                }
            }
        }
        
        // 根据关卡等级生成随机路障
        const obstacleCount = Math.min(15, 3 + Math.floor(level / 2));
        let placed = 0;
        
        while (placed < obstacleCount) {
            const r = Math.floor(Math.random() * MAP_GRID.length);
            const c = Math.floor(Math.random() * MAP_GRID[0].length);
            if (MAP_GRID[r][c] === 0) {
                MAP_GRID[r][c] = 2;
                placed++;
            }
        }
        this.renderMap();
    }

    public renderMap(): void {
        this.view.removeChildren();
        this.portals = [];

        // 1. 全屏滚动的修仙风背景
        if (!this.bgSprite) {
            const bgTexture = Assets.get('bg') as Texture;
            if (bgTexture) {
                this.bgSprite = new TilingSprite(bgTexture, GAME.WIDTH, GAME.HEIGHT);
                this.bgLayer.addChild(this.bgSprite);
            }
        }

        const grassTex = Assets.get('grass');
        const roadTex = Assets.get('road');
        const rockTex = Assets.get('rock');

        // 3. 遍历渲染地块实体
        for (let row = 0; row < MAP_GRID.length; row++) {
            for (let col = 0; col < MAP_GRID[row].length; col++) {
                const cell = MAP_GRID[row][col];
                let texture: Texture | null = grassTex; 

                switch (cell) {
                    case 1: texture = roadTex; break;
                    case 2: texture = rockTex; break;
                    case 3: texture = roadTex; break; // 底图还是道路
                    case 4: texture = roadTex; break; 
                }

                if (texture) {
                    const tile = new Sprite(texture);
                    tile.x = col * TILE_SIZE;
                    tile.y = row * TILE_SIZE;
                    tile.width = TILE_SIZE;
                    tile.height = TILE_SIZE;
                    
                    tile.eventMode = 'static';
                    const capturedRow = row;
                    const capturedCol = col;
                    tile.on('pointerdown', (e) => {
                        InputManager.getInstance().onMapTileClicked(e, capturedRow, capturedCol, tile);
                    });

                    this.view.addChild(tile);
                }
                
                // 绘制特效传送阵
                if (cell === 3 || cell === 4) {
                    const portal = new Graphics();
                    portal.x = col * TILE_SIZE + TILE_SIZE / 2;
                    portal.y = row * TILE_SIZE + TILE_SIZE / 2;
                    
                    if (cell === 3) {
                        portal.beginFill(0x00FFFF, 0.4);
                        portal.lineStyle(2, 0x00FFFF, 0.8);
                        portal.drawCircle(0, 0, TILE_SIZE * 0.4);
                        portal.endFill();
                        
                        portal.beginFill(0xFFFFFF, 0.8);
                        portal.drawCircle(0, 0, TILE_SIZE * 0.2);
                        portal.endFill();
                        this.portals.push({ view: portal, type: 'start', time: 0 });
                    } else {
                        portal.beginFill(0xFF0000, 0.4);
                        portal.lineStyle(2, 0x8B0000, 0.8);
                        portal.drawCircle(0, 0, TILE_SIZE * 0.4);
                        portal.endFill();
                        
                        portal.beginFill(0x4B0082, 0.8);
                        portal.drawCircle(0, 0, TILE_SIZE * 0.25);
                        portal.endFill();
                        this.portals.push({ view: portal, type: 'end', time: 0 });
                    }
                    this.view.addChild(portal);
                }
            }
        }
    }

    public update(deltaMS: number) {
        for (const p of this.portals) {
            p.time += deltaMS;
            p.view.rotation += (p.type === 'start' ? 0.002 : -0.003) * deltaMS;
            const scale = 1 + Math.sin(p.time * 0.005) * 0.1;
            p.view.scale.set(scale);
        }
    }

    /**
     * 遍历路线，获取从起点到终点的有序路径点坐标
     * 寻路点位于每个网格的中心位置
     */
    public getWaypoints(): { x: number, y: number }[] {
        const waypoints: { x: number, y: number }[] = [];
        const rows = MAP_GRID.length;
        const cols = MAP_GRID[0].length;
        
        let startR = -1;
        let startC = -1;

        // 1. 寻找起点
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (MAP_GRID[r][c] === 3) {
                    startR = r;
                    startC = c;
                    break;
                }
            }
            if (startR !== -1) break;
        }

        // 没找到起点则直接返回空数组
        if (startR === -1 || startC === -1) return waypoints;

        const visited = new Set<string>();
        let currentR = startR;
        let currentC = startC;

        // 2. 沿着路径走到终点
        while (true) {
            // 确保坐标为网格中心点
            waypoints.push({
                x: currentC * TILE_SIZE + TILE_SIZE / 2,
                y: currentR * TILE_SIZE + TILE_SIZE / 2
            });
            visited.add(`${currentR},${currentC}`);

            if (MAP_GRID[currentR][currentC] === 4) {
                break; // 抵达终点，循环结束
            }

            // 寻找下一个路径点 (上, 下, 左, 右)
            const neighbors = [
                { r: currentR - 1, c: currentC },
                { r: currentR + 1, c: currentC },
                { r: currentR, c: currentC - 1 },
                { r: currentR, c: currentC + 1 }
            ];

            let nextR = -1;
            let nextC = -1;

            for (const n of neighbors) {
                if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
                    const key = `${n.r},${n.c}`;
                    if (!visited.has(key)) {
                        const cellType = MAP_GRID[n.r][n.c];
                        if (cellType === 1 || cellType === 4) {
                            nextR = n.r;
                            nextC = n.c;
                            break;
                        }
                    }
                }
            }

            if (nextR === -1 && nextC === -1) {
                break; // 路径中断
            }

            currentR = nextR;
            currentC = nextC;
        }

        return waypoints;
    }
}
