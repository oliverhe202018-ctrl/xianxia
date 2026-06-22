import { Graphics } from 'pixi.js';
import { MAP_GRID, TILE_SIZE } from '../config/MapConfig';

export class MapManager {
    public view: Graphics;

    constructor() {
        this.view = new Graphics();
        this.renderMap();
    }

    public renderMap(): void {
        this.view.clear();
        for (let row = 0; row < MAP_GRID.length; row++) {
            for (let col = 0; col < MAP_GRID[row].length; col++) {
                const cell = MAP_GRID[row][col];
                let color = 0xCCCCCC; // 0: 空地 (浅灰)

                switch (cell) {
                    case 1: color = 0x666666; break; // 道路 (深灰)
                    case 2: color = 0x8B4513; break; // 障碍物 (棕色)
                    case 3: color = 0x00FF00; break; // 起点 (绿色)
                    case 4: color = 0xFF0000; break; // 终点 (红色)
                }

                this.view.beginFill(color);
                this.view.lineStyle(1, 0xFFFFFF, 0.5); // 绘制白色半透明网格线
                this.view.drawRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                this.view.endFill();
            }
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
            // 确保坐标为网格中心点 (中心坐标 = 行列索引 * 格子尺寸 + 格子尺寸 / 2)
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
                // 检查边界
                if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
                    const key = `${n.r},${n.c}`;
                    if (!visited.has(key)) {
                        const cellType = MAP_GRID[n.r][n.c];
                        // 寻找未访问的道路(1)或终点(4)
                        if (cellType === 1 || cellType === 4) {
                            nextR = n.r;
                            nextC = n.c;
                            break;
                        }
                    }
                }
            }

            if (nextR === -1 && nextC === -1) {
                break; // 路径中断（没有下一个有效相连节点），防止死循环
            }

            currentR = nextR;
            currentC = nextC;
        }

        return waypoints;
    }
}
