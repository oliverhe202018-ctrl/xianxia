export interface BossState {
    name: string;
    onEnter?: () => void;
    onUpdate?: (delta: number) => void;
    onExit?: () => void;
}

export class BossStateMachine {
    private currentState: BossState | null = null;
    private states: Map<string, BossState> = new Map();

    public addState(state: BossState) {
        this.states.set(state.name, state);
    }

    public transitionTo(stateName: string) {
        if (this.currentState && this.currentState.name === stateName) return;
        
        const nextState = this.states.get(stateName);
        if (!nextState) {
            console.warn(`[BossStateMachine] 找不到状态: ${stateName}`);
            return;
        }

        if (this.currentState && this.currentState.onExit) {
            this.currentState.onExit();
        }

        this.currentState = nextState;

        if (this.currentState.onEnter) {
            this.currentState.onEnter();
        }
    }

    public update(delta: number) {
        if (this.currentState && this.currentState.onUpdate) {
            this.currentState.onUpdate(delta);
        }
    }

    public getCurrentStateName(): string | null {
        return this.currentState ? this.currentState.name : null;
    }
}
