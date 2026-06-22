export interface TaskData {
    id: string;
    name: string;
    desc: string;
    targetValue: number;
    eventType: string;
    rewardDesc: string;
}

export const DailyTasks: TaskData[] = [
    { id: 'kill_100', name: '除魔', desc: '单局击杀 100 敌军', targetValue: 100, eventType: 'combat:kill', rewardDesc: '灵石x500' },
    { id: 'merge_3', name: '布阵', desc: '合成 1 个 3阶塔', targetValue: 1, eventType: 'tower:merged', rewardDesc: '无字天书x1' },
    { id: 'shovel_5', name: '开荒', desc: '使用铲子 5 次', targetValue: 5, eventType: 'tile:cleared', rewardDesc: '灵石x300' }
];
