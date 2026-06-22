import { EventBus } from '../core/EventBus';
import { DailyTasks } from '../config/TaskConfig';

export enum TaskState {
    IN_PROGRESS = 0,
    AVAILABLE = 1,
    CLAIMED = 2
}

export class TaskManager {
    private static instance: TaskManager;
    private progress: Record<string, number> = {};
    private states: Record<string, TaskState> = {};

    private constructor() {
        // 初始化进度
        for (const t of DailyTasks) {
            this.progress[t.id] = 0;
            this.states[t.id] = TaskState.IN_PROGRESS;
            
            // 绑定事件监听
            EventBus.on(t.eventType as any, (data: any) => this.handleEvent(t.id, t.eventType, data));
        }
    }

    public static getInstance(): TaskManager {
        if (!TaskManager.instance) {
            TaskManager.instance = new TaskManager();
        }
        return TaskManager.instance;
    }

    private handleEvent(taskId: string, eventType: string, data: any) {
        if (this.states[taskId] !== TaskState.IN_PROGRESS) return;

        const taskDef = DailyTasks.find(t => t.id === taskId);
        if (!taskDef) return;

        let increment = 1;
        // 特定逻辑过滤：布阵任务要求合成 3阶塔
        if (eventType === 'tower:merged') {
            if (data.newRank < 3) return; // 只有合成大于等于3阶才算
        }

        this.progress[taskId] += increment;
        console.log(`[任务进度更新] ${taskDef.name}: ${this.progress[taskId]} / ${taskDef.targetValue}`);

        if (this.progress[taskId] >= taskDef.targetValue) {
            this.progress[taskId] = taskDef.targetValue;
            this.states[taskId] = TaskState.AVAILABLE;
            console.log(`[任务完成] ${taskDef.name} 可领取奖励!`);
            // 通知 UI 更新
            EventBus.emit('task:updated', { taskId });
        }
    }

    public claimReward(taskId: string): boolean {
        if (this.states[taskId] === TaskState.AVAILABLE) {
            this.states[taskId] = TaskState.CLAIMED;
            console.log(`[任务奖励领取] 已领取任务 ${taskId} 的奖励`);
            EventBus.emit('task:updated', { taskId });
            return true;
        }
        return false;
    }

    public getTaskProgress(taskId: string): { progress: number, state: TaskState } {
        return {
            progress: this.progress[taskId] || 0,
            state: this.states[taskId] ?? TaskState.IN_PROGRESS
        };
    }
}
