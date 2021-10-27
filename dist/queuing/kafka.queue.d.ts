import { Kafka } from 'kafkajs';
import { ICaching } from '../caching/caching.factory';
import { IBusReactiveParams } from '../models/IBusReactiveParams';
import { IQueue } from './queuing.factory';
export declare class KafkaQueue implements IQueue {
    private readonly caching;
    private registry;
    private isProducerConnected;
    private DEFAULT_NUMBER_OF_PARTITIONS;
    private DEFAULT_REPLICATION_FACTOR;
    private DLQ_COUNT_RETRY;
    private listenTopicHandlers;
    kafka: Kafka;
    admin: import("kafkajs").Admin;
    private fromBeginningConsumer;
    private producer;
    constructor(caching: ICaching);
    registerSchema: (schemas: string[]) => Promise<void>;
    generateSchemas: (services: string[]) => Promise<(import("@kafkajs/confluent-schema-registry/dist/@types").Schema | import("@kafkajs/confluent-schema-registry/dist/@types").AvroSchema)[]>;
    attach: (params: IBusReactiveParams) => Promise<void>;
    detach: (service: any, action: any) => Promise<void>;
    publish: (action: any, key: any, data: any, service?: any) => Promise<import("kafkajs").RecordMetadata[]>;
    bulkPublish: (action: any, messages: any[], service?: any) => Promise<import("kafkajs").RecordMetadata[]>;
    shutdown(): Promise<void>;
    private messagesHandler;
    private messageHandler;
    isHealth: () => Promise<boolean>;
}
