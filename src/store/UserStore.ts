export class UserStore {
    private static instance: UserStore;

    // 缓存的用户基础数据
    private userId: string = '';
    private level: number = 1;
    private isVip: boolean = false;
    
    // 局外属性加成
    private baseAttackBuff: number = 0.0;
    private startingEnergy: number = 100;

    private constructor() {}

    public static getInstance(): UserStore {
        if (!UserStore.instance) {
            UserStore.instance = new UserStore();
        }
        return UserStore.instance;
    }

    /**
     * 模拟从 Supabase/Prisma 后端拉取用户数据。
     * 实际项目中这里应通过 fetch 或 supabase-js 调用相关 API 接口。
     */
    public async fetchUserData(): Promise<void> {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        // 模拟数据库返回的测试数据：VIP用户，自带 20% 攻击加成和 200 初始开局灵气
        this.userId = 'mock-user-uuid-1234';
        this.level = 10;
        this.isVip = true;
        
        this.baseAttackBuff = 0.20; // 20% 额外攻击力加成
        this.startingEnergy = 200; // 初始灵气变为 200
        
        console.log(`[UserStore] User data fetched. Attack Buff: +${this.baseAttackBuff * 100}%, Starting Energy: ${this.startingEnergy}`);
    }

    public getAttackBuffMultiplier(): number {
        return this.baseAttackBuff;
    }

    public getStartingEnergy(): number {
        return this.startingEnergy;
    }

    public getIsVip(): boolean {
        return this.isVip;
    }
}
