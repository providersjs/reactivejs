import { RedisCache } from './redis.cache'
import * as sinon from 'sinon'

describe('RedisCache tests', () => {

    let redisCache: RedisCache = new RedisCache();
    const OLD_ENV = process.env;

    beforeAll(() => {
        sinon.stub(redisCache.pub_redis, "connect").callsFake(async () => {
            return
        })

        sinon.stub(redisCache.pub_redis, "select").callsFake(async (db) => {
            return
        })

        sinon.stub(redisCache.sub_redis, "connect").callsFake(async () => {
            return
        })

        sinon.stub(redisCache.sub_redis, "select").callsFake(async (db) => {
            return
        })

        process.env = {
            ...OLD_ENV,
            KAFKA_SERVICE_NAME: 'test'
        }
    })

        test("Expect init to subscribe to key based on service name", async () => {
            
            const spy = sinon.spy(redisCache.sub_redis, "pSubscribe");
            await redisCache.init()

            spy.calledWith(`service:${process.env.KAFKA_SERVICE_NAME}:key*`)

        })
        test("registerOnChange should add callback to the messageCallback hashmap", async () => {

            const callbackFunction = () => { console.log('cb') }
            await redisCache.registerOnChange('hello', callbackFunction)
            expect(redisCache.messages_callbacks['hello']).toBe(callbackFunction);
            
        })
        test('registerOnChange should be triggered when key changes',async ()=> {
            const callbackFunction = sinon.spy((data) => { 
                console.log('cb') 
            })
            await redisCache.registerOnChange('hello', callbackFunction)
            //@ts-ignore
            const triggerKey = redisCache.sub_redis.pSubscribe.args[0][1]
            await triggerKey('{ "message": true }','hello');
            expect(callbackFunction.called).toBe(true)
            expect(callbackFunction.calledWith({ "message": true }));
        })

    afterAll(() => {
        process.env = OLD_ENV; // Restore old environment
    });

})
