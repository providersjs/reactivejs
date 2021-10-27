import { createClient } from 'redis'
import { promisify } from 'util';
import { ICaching } from './caching.factory';

export class RedisCache implements ICaching {

  readonly pub_redis = createClient({
    socket: {
      host: (process.env.REDIS_HOST || 'localhost'),
      port: (process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379),
    },
  })

  readonly sub_redis = createClient({
    socket: {
      host: (process.env.REDIS_HOST || 'localhost'),
      port: (process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379),
    }
  })
  messages_callbacks = {}

  init = async () => {

    await this.sub_redis.connect();
    //@ts-ignore
    this.sub_redis.on('error', (err) => console.log('Redis Client Error', err));
    //@ts-ignore
    this.sub_redis.on('connect', () => console.info('INFO:REDIS:Connected!'));

    //@ts-ignore
    await this.sub_redis.select(0);

    await this.pub_redis.connect();
    //@ts-ignore
    this.pub_redis.on('error', (err) => console.log('Redis Client Error', err));
    //@ts-ignore
    this.pub_redis.on('connect', () => console.info('INFO:REDIS:Connected!'));

    //@ts-ignore
    await this.pub_redis.select(0);
    this.sub_redis.pSubscribe(`service:${process.env.KAFKA_SERVICE_NAME}:key*`, async (value, key) => {
      try {
        if (!this.messages_callbacks[key]) {
          return;
        }
        const result = JSON.parse(value)
        if (result.err) {
          this.messages_callbacks[key](null, result.err)
        } else {
          this.messages_callbacks[key](result, null) //resolve the promise!
        }
        delete this.messages_callbacks[key];
        this.sub_redis.unsubscribe(key); //remove the subscriber
      }
      catch (err) {
        delete this.messages_callbacks[key];
        console.error(`Critical Error! with redis - ${err}`)
      }
    })
  }

  set = async (key, value) => {
    return await this.pub_redis.SET(key, value.toString())
  }

  publish = async (key, value) => {
    return await this.pub_redis.publish(key, value.toString())
  }

  get = async (key) => {
    return await this.pub_redis.get(key)
  }

  delete = async (key) => {
    return await this.pub_redis.del(key)
  }

  registerOnChange = (key, cb_handler) => {
    console.debug(`subscribing to key ${key}`)
    this.messages_callbacks[key] = cb_handler
    return true;
  }

  unRegisterOnChange = (key) => {
    delete this.messages_callbacks[key];
    return true;
  }

  async shutdown() {
    await promisify(this.sub_redis.quit).bind(this.sub_redis)()
    await promisify(this.pub_redis.quit).bind(this.pub_redis)()
  }

  isHealth = async () => {
    return this.pub_redis.isOpen && this.sub_redis.isOpen;
  }

}