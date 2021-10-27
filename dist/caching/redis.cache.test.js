"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const redis_cache_1 = require("./redis.cache");
const sinon = require("sinon");
describe('RedisCache tests', () => {
    let redisCache = new redis_cache_1.RedisCache();
    const OLD_ENV = process.env;
    beforeAll(() => {
        sinon.stub(redisCache.pub_redis, "connect").callsFake(() => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            return;
        }));
        sinon.stub(redisCache.pub_redis, "select").callsFake((db) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            return;
        }));
        sinon.stub(redisCache.sub_redis, "connect").callsFake(() => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            return;
        }));
        sinon.stub(redisCache.sub_redis, "select").callsFake((db) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
            return;
        }));
        process.env = Object.assign(Object.assign({}, OLD_ENV), { KAFKA_SERVICE_NAME: 'test' });
    });
    test("Expect init to subscribe to key based on service name", () => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
        const spy = sinon.spy(redisCache.sub_redis, "pSubscribe");
        yield redisCache.init();
        spy.calledWith(`service:${process.env.KAFKA_SERVICE_NAME}:key*`);
    }));
    test("registerOnChange should add callback to the messageCallback hashmap", () => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
        const callbackFunction = () => { console.log('cb'); };
        yield redisCache.registerOnChange('hello', callbackFunction);
        expect(redisCache.messages_callbacks['hello']).toBe(callbackFunction);
    }));
    test('registerOnChange should be triggered when key changes', () => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
        const callbackFunction = sinon.spy((data) => {
            console.log('cb');
        });
        yield redisCache.registerOnChange('hello', callbackFunction);
        //@ts-ignore
        const triggerKey = redisCache.sub_redis.pSubscribe.args[0][1];
        yield triggerKey('{ "message": true }', 'hello');
        expect(callbackFunction.called).toBe(true);
        expect(callbackFunction.calledWith({ "message": true }));
    }));
    afterAll(() => {
        process.env = OLD_ENV; // Restore old environment
    });
});
//# sourceMappingURL=redis.cache.test.js.map