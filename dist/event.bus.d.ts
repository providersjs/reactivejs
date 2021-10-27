import { IBusReactiveParams } from './models/IBusReactiveParams';
declare class EventBusHandler {
    dryRun: boolean;
    private caching;
    private queue;
    constructor();
    init: () => Promise<this>;
    reactiveAttach: (params: IBusReactiveParams) => Promise<void>;
    publishAsync: (action: string, obj: {
        payload: any;
    }, toDomain?: any) => Promise<boolean>;
    bulkPublishAsync: (action: string, messages: {
        payload: any;
    }[], toDomain?: any) => Promise<boolean>;
    getAsync: (formDomain: any, action: string, obj: {
        payload: any;
    }, timeout?: number) => Promise<any>;
    shutDown: () => Promise<void>;
    private uuidv4;
    healthCheck: () => Promise<any>;
}
export declare const EventBus: EventBusHandler;
export {};
