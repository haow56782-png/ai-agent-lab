export declare function isRedisEnabled(): boolean;
export declare function redisGet(key: string): Promise<string | null>;
export declare function redisSetEx(key: string, ttlSeconds: number, value: string): Promise<void>;
export declare function redisDel(key: string): Promise<void>;
