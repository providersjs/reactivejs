export interface ICaching {
    set(key: any, value: any): any;
    get(key: any): Promise<any>;
    delete(key: any): Promise<any>;
    registerOnChange(key: any, cb: any): boolean;
    unRegisterOnChange(key: any): boolean;
    shutdown(): any;
    init(): Promise<void>;
    publish(key: any, value: any): Promise<any>;
    isHealth(): any;
}
export declare function caching(type: any): ICaching;
