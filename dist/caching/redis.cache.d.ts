import { ICaching } from './caching.factory';
export declare class RedisCache implements ICaching {
    readonly pub_redis: import("redis/dist/lib/client").RedisClientType<{}, {}>;
    readonly sub_redis: import("redis/dist/lib/client").RedisClientType<{}, {}>;
    messages_callbacks: {};
    init: () => Promise<void>;
    set: (key: any, value: any) => Promise<string | null>;
    publish: (key: any, value: any) => Promise<number>;
    get: (key: any) => Promise<string | null>;
    delete: (key: any) => Promise<number>;
    registerOnChange: (key: any, cb_handler: any) => boolean;
    unRegisterOnChange: (key: any) => boolean;
    shutdown(): Promise<void>;
    isHealth: () => Promise<boolean>;
}
