import { caching, ICaching } from './caching/caching.factory';
import { IBusReactiveParams } from './models/IBusReactiveParams';
import { IQueue, queuing } from './queuing/queuing.factory';
import * as fs from 'fs'
import { promisify } from 'util';

class EventBusHandler {
  dryRun: boolean = false;
  //@ts-ignore
  private caching: ICaching;
  //@ts-ignore
  private queue: IQueue;

  constructor() {
    this.dryRun = process.env.EVENT_BUS_DRY == "1" ? true : false
    if (!this.dryRun) {
      this.caching = caching("redis")
      this.queue = queuing("kafka", this.caching);
    }
  }

  init = async () => {
    await this.caching.init();
    return this;
  }

  reactiveAttach = async (params: IBusReactiveParams) => {
    if (this.dryRun) return
    await this.queue.attach(params)
  }

  publishAsync = async (action: string, obj: { payload: any }, toDomain?): Promise<boolean> => {
    if (this.dryRun) return true
    return await this.queue.publish(action, this.uuidv4(), obj, toDomain)
  }

  bulkPublishAsync = async (action: string, messages: { payload: any }[], toDomain?): Promise<boolean> => {
    if (this.dryRun) return true
    const formattedMessages = messages.map((message) => {
      return {
        key: this.uuidv4(),
        value: Buffer.from(JSON.stringify(message))
      }
    })
    return await this.queue.bulkPublish(action, formattedMessages, toDomain)
  }

  getAsync = async (formDomain, action: string, obj: { payload: any },timeout=30000): Promise<any> => {
    if (this.dryRun) return
    return new Promise(async (resolve, reject) => {
      const key = this.uuidv4(); //message key;
      const messageKey = `service:${process.env.KAFKA_SERVICE_NAME}:key:${key}`
      await this.caching.set(messageKey, "-1") //set empty value and wait for response;
      this.caching.registerOnChange(messageKey, (value,error) => { //mark to be deleted!
        this.caching.delete(messageKey);
        if(error) reject(new Error(error))
        resolve(value);
      })
      await this.queue.publish(action, messageKey, obj, formDomain); //publish message to the queue
      setTimeout(()=>{
        const errorMessage = `request timeout ${timeout} exceeded`
        this.caching.unRegisterOnChange(messageKey);
        this.caching.delete(messageKey);
        reject(new Error(errorMessage))
      },timeout)
    })
  }

  shutDown = async () => {
    if (this.dryRun) return
    await this.queue.shutdown();
    await this.caching.shutdown();
  }

  private uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  healthCheck = async () => {
     const isQueueHealth =  await this.queue.isHealth()
     const isCachingHealth =  await this.caching.isHealth()
     return isQueueHealth && isCachingHealth;
  }
}

export const EventBus = new EventBusHandler()
