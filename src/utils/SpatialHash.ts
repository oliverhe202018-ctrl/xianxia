import { GAME } from '../config/game';

export interface SpatialEntity {
    id: number;
    transform: { x: number, y: number };
    [key: string]: any; // Allow _spatialIndex to be attached
}

export class SpatialHash {
    private cellSize: number;
    private cols: number;
    private rows: number;
    // 使用一维数组拉平二维网格结构，避免对象创建开销
    private cells: Set<SpatialEntity>[];

    constructor(cellSize: number = 50) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(GAME.WIDTH / cellSize);
        this.rows = Math.ceil(GAME.HEIGHT / cellSize);
        const totalCells = this.cols * this.rows;
        
        this.cells = new Array(totalCells);
        for (let i = 0; i < totalCells; i++) {
            this.cells[i] = new Set<SpatialEntity>();
        }
    }

    private getCellIndex(x: number, y: number): number {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return -1;
        return row * this.cols + col;
    }

    public insert(entity: SpatialEntity): void {
        const index = this.getCellIndex(entity.transform.x, entity.transform.y);
        if (index !== -1) {
            this.cells[index].add(entity);
            // 缓存当前 index，方便后续 update / remove
            entity._spatialIndex = index;
        }
    }

    public remove(entity: SpatialEntity): void {
        const index = entity._spatialIndex;
        if (index !== undefined && index !== -1) {
            this.cells[index].delete(entity);
            entity._spatialIndex = -1;
        }
    }

    public update(entity: SpatialEntity): void {
        const newIndex = this.getCellIndex(entity.transform.x, entity.transform.y);
        const oldIndex = entity._spatialIndex;

        if (newIndex !== oldIndex) {
            if (oldIndex !== undefined && oldIndex !== -1) {
                this.cells[oldIndex].delete(entity);
            }
            if (newIndex !== -1) {
                this.cells[newIndex].add(entity);
            }
            entity._spatialIndex = newIndex;
        }
    }

    public queryRange(x: number, y: number, radius: number): SpatialEntity[] {
        const result: SpatialEntity[] = [];
        
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        const radiusSq = radius * radius;

        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const index = r * this.cols + c;
                for (const entity of this.cells[index]) {
                    const dx = entity.transform.x - x;
                    const dy = entity.transform.y - y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        result.push(entity);
                    }
                }
            }
        }
        return result;
    }
}
