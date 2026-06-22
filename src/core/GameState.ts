export type GameStateListener = (stones: number) => void;

export class GameState {
    private static instance: GameState;
    
    private _spiritStones: number = 0;
    private listeners: GameStateListener[] = [];

    private constructor() {}

    public static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }

    public get spiritStones(): number {
        return this._spiritStones;
    }

    // 允许根据外部（例如 UserStore）传入的值初始化灵石
    public setStones(amount: number) {
        this._spiritStones = amount;
        this.notify();
    }

    public addStones(amount: number) {
        this._spiritStones += amount;
        this.notify();
    }

    public spendStones(amount: number): boolean {
        if (this._spiritStones >= amount) {
            this._spiritStones -= amount;
            this.notify();
            return true;
        }
        return false;
    }

    public onStonesChanged(listener: GameStateListener) {
        this.listeners.push(listener);
        listener(this._spiritStones);
    }

    private notify() {
        for (const listener of this.listeners) {
            listener(this._spiritStones);
        }
    }
}
