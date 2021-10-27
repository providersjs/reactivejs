import { ICaching } from "../caching/caching.factory";
import { IBusReactiveParams } from "../models/IBusReactiveParams";
import { KafkaQueue } from "./kafka.queue";

export interface IQueue {
  attach(busReactiveQueue:IBusReactiveParams);
  detach(service,action);
  publish(action,key,data,service?);
  bulkPublish(action,data,service?);
  registerSchema(schemas:string[]);
  generateSchemas(services:string[]);
  shutdown();
  isHealth():Promise<boolean>;
}
export function queuing(type,caching:ICaching):IQueue {
  return new KafkaQueue(caching)
}