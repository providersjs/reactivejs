export interface IBusReactiveParams {
    domain?: string;
    action: string;
    fromBeginningConsumer?: boolean;
    resetToLatest?: boolean;
    resetToEarliest?: boolean;
    autoCreate?: boolean;
    numberOfPartitions?: number;
    replicationFactor?: number;
    expectedEventSchema?: any;
    isBatch?: boolean;
    cb?: (k: any, m: any) => any;
    consumerParams?: any;
    messageFormat?: MessageFormat;
}
export declare enum MessageFormat {
    Json = 1,
    AVRO = 2
}
