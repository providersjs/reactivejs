"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCache = void 0;
const tslib_1 = require("tslib");
const redis_1 = require("redis");
const util_1 = require("util");
class RedisCache {
    constructor() {
        this.pub_redis = (0, redis_1.createClient)({
            socket: {
                host: (process.env.REDIS_HOST || 'localhost'),
                port: (process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379),
            },
        });
        this.sub_redis = (0, redis_1.createClient)({
            socket: {
                host: (process.env.REDIS_HOST || 'localhost'),
                port: (process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379),
            }
        });
        this.messages_callbacks = {};
        this.init = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield this.sub_redis.connect();
            //@ts-ignore
            this.sub_redis.on('error', (err) => console.log('Redis Client Error', err));
            //@ts-ignore
            this.sub_redis.on('connect', () => console.info('INFO:REDIS:Connected!'));
            //@ts-ignore
            yield this.sub_redis.select(0);
            yield this.pub_redis.connect();
            //@ts-ignore
            this.pub_redis.on('error', (err) => console.log('Redis Client Error', err));
            //@ts-ignore
            this.pub_redis.on('connect', () => console.info('INFO:REDIS:Connected!'));
            //@ts-ignore
            yield this.pub_redis.select(0);
            this.sub_redis.pSubscribe(`service:${process.env.KAFKA_SERVICE_NAME}:key*`, (value, key) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                try {
                    if (!this.messages_callbacks[key]) {
                        return;
                    }
                    const result = JSON.parse(value);
                    if (result.err) {
                        this.messages_callbacks[key](null, result.err);
                    }
                    else {
                        this.messages_callbacks[key](result, null); //resolve the promise!
                    }
                    delete this.messages_callbacks[key];
                    this.sub_redis.unsubscribe(key); //remove the subscriber
                }
                catch (err) {
                    delete this.messages_callbacks[key];
                    console.error(`Critical Error! with redis - ${err}`);
                }
            }));
        });
        this.set = (key, value) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return yield this.pub_redis.SET(key, value.toString());
        });
        this.publish = (key, value) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return yield this.pub_redis.publish(key, value.toString());
        });
        this.get = (key) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return yield this.pub_redis.get(key);
        });
        this.delete = (key) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return yield this.pub_redis.del(key);
        });
        this.registerOnChange = (key, cb_handler) => {
            console.debug(`subscribing to key ${key}`);
            this.messages_callbacks[key] = cb_handler;
            return true;
        };
        this.unRegisterOnChange = (key) => {
            delete this.messages_callbacks[key];
            return true;
        };
        this.isHealth = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return this.pub_redis.isOpen && this.sub_redis.isOpen;
        });
    }
    shutdown() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield (0, util_1.promisify)(this.sub_redis.quit).bind(this.sub_redis)();
            yield (0, util_1.promisify)(this.pub_redis.quit).bind(this.pub_redis)();
        });
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=redis.cache.js.map