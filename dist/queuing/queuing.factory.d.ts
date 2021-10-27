import { ICaching } from "../caching/caching.factory";
import { IBusReactiveParams } from "../models/IBusReactiveParams";
export interface IQueue {
    attach(busReactiveQueue: IBusReactiveParams): any;
    detach(service: any, action: any): any;
    publish(action: any, key: any, data: any, service?: any): any;
    bulkPublish(action: any, data: any, service?: any): any;
    registerSchema(schemas: string[]): any;
    generateSchemas(services: string[]): any;
    shutdown(): any;
    isHealth(): Promise<boolean>;
}
export declare function queuing(type: any, caching: ICaching): IQueue;
