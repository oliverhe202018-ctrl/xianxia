import { TowerCharName } from '../config/GameConfig';

export interface GameEventMap {
    'gacha:request': { amount: number };
    'gacha:result': { charName: TowerCharName, rank: number };
    'tower:merged': { entityId: number, charName: TowerCharName, newRank: number };
    'level:start': { level: number };
    'game:over': void;
}

type EventCallback<T> = (data: T) => void;

class EventBusImpl {
    private handlers: { [K in keyof GameEventMap]?: EventCallback<GameEventMap[K]>[] } = {};

    on<K extends keyof GameEventMap>(event: K, handler: EventCallback<GameEventMap[K]>): void {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event]!.push(handler);
    }

    off<K extends keyof GameEventMap>(event: K, handler: EventCallback<GameEventMap[K]>): void {
        if (!this.handlers[event]) return;
        this.handlers[event] = (this.handlers[event] as any).filter((h: any) => h !== handler);
    }

    emit<K extends keyof GameEventMap>(event: K, data: GameEventMap[K]): void {
        if (!this.handlers[event]) return;
        this.handlers[event]!.forEach(handler => handler(data));
    }
}

export const EventBus = new EventBusImpl();
