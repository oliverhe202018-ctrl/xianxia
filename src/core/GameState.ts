export type GameStateListener = (stones: number, health: number, maxHealth: number) => void;

export enum GamePhase {
    LOBBY = 'LOBBY',
    PLAYING = 'PLAYING',
    GAME_OVER = 'GAME_OVER'
}

export class GameState {
    private static instance: GameState;
    
    private _spiritStones: number = 0;
    private _health: number = 10;
    private _maxHealth: number = 10;
    private _phase: GamePhase = GamePhase.LOBBY;
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

    public get health(): number { return this._health; }
    public get maxHealth(): number { return this._maxHealth; }
    public get phase(): GamePhase { return this._phase; }

    public setPhase(phase: GamePhase) {
        this._phase = phase;
        this.notify();
    }

    public deductHealth(amount: number) {
        if (this._phase !== GamePhase.PLAYING) return;
        this._health -= amount;
        if (this._health <= 0) {
            this._health = 0;
            this.setPhase(GamePhase.GAME_OVER);
        }
        this.notify();
    }

    public resetGame(startingEnergy: number) {
        this._health = this._maxHealth;
        this._spiritStones = startingEnergy;
        this._phase = GamePhase.PLAYING;
        this.notify();
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

    public onStateChanged(listener: GameStateListener) {
        this.listeners.push(listener);
        listener(this._spiritStones, this._health, this._maxHealth);
    }

    private notify() {
        for (const listener of this.listeners) {
            listener(this._spiritStones, this._health, this._maxHealth);
        }
    }
}
