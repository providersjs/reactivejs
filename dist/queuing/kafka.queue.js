"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaQueue = void 0;
const tslib_1 = require("tslib");
const kafkajs_1 = require("kafkajs");
const confluent_schema_registry_1 = require("@kafkajs/confluent-schema-registry");
class KafkaQueue {
    constructor(caching) {
        this.caching = caching;
        //@ts-ignore
        this.registry = new confluent_schema_registry_1.SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL });
        this.isProducerConnected = false;
        this.DEFAULT_NUMBER_OF_PARTITIONS = 7;
        this.DEFAULT_REPLICATION_FACTOR = 3;
        this.DLQ_COUNT_RETRY = +process.env.RETRY_DLQ_COUNT || 3;
        this.listenTopicHandlers = {};
        this.kafka = new kafkajs_1.Kafka({
            clientId: 'api',
            brokers: [process.env.KAFKA_BROKER],
            connectionTimeout: +process.env.EVENT_BUS_CONNECTION_TIMEOUT || 30000,
            requestTimeout: +process.env.EVENT_BUS_REQUEST_TIMEOUT || 30000,
            retry: {
                //@ts-ignore
                initialRetryTime: (+process.env.EVENT_BUS_TIME || 300),
                //@ts-ignore
                retries: (+process.env.EVENT_BUS_RETRY || 10)
            },
            logLevel: kafkajs_1.logLevel.ERROR
        });
        this.admin = this.kafka.admin({});
        this.fromBeginningConsumer = process.env.FROM_BEGINNING == "1" ? true : false;
        this.producer = this.kafka.producer();
        this.registerSchema = (schemas) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield Promise.all(schemas.map((schema) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                return yield this.registry.register({ type: confluent_schema_registry_1.SchemaType.AVRO, schema });
            })));
        });
        this.generateSchemas = (services) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const schema = yield Promise.all(services.map((service) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                const id = yield this.registry.getLatestSchemaId(service);
                return yield this.registry.getSchema(id);
            })));
            return schema;
        });
        this.attach = (params) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let topic = `${params.action.toUpperCase()}`;
            if (params.domain) {
                topic = `${params.domain.toUpperCase()}_${topic}`;
            }
            try {
                //first create the topic
                const topics = yield this.admin.listTopics();
                if (topics.indexOf(`${topic}`) == -1) {
                    yield this.admin.createTopics({ topics: [{ topic: `${topic}`, numPartitions: (params.numberOfPartitions || this.DEFAULT_NUMBER_OF_PARTITIONS), replicationFactor: (params.replicationFactor || this.DEFAULT_REPLICATION_FACTOR) }] });
                }
            }
            catch (err) { }
            const groupId = `${process.env.KAFKA_GROUP.toUpperCase()}_${topic}`;
            try {
                if (params.resetToLatest) {
                    yield this.admin.resetOffsets({ groupId, topic, earliest: false });
                }
                else if (params.resetToEarliest) {
                    yield this.admin.resetOffsets({ groupId, topic, earliest: true });
                }
            }
            catch (err) {
                console.warn(`unable to reset offsets ${err}`);
            }
            //then consume messages
            const consumer = this.kafka.consumer(Object.assign({ groupId, allowAutoTopicCreation: true }, params.consumerParams));
            yield consumer.connect();
            yield consumer.subscribe({ topic: `${topic}`, fromBeginning: params.fromBeginningConsumer ? params.fromBeginningConsumer : this.fromBeginningConsumer }); //attach to kafka topic
            const { HEARTBEAT } = consumer.events;
            if (params.isBatch) {
                yield consumer.run({
                    eachBatchAutoResolve: false,
                    eachBatch: this.messagesHandler
                });
            }
            else {
                yield consumer.run({
                    eachMessage: this.messageHandler,
                });
            }
            this.listenTopicHandlers[`${topic}`] = { cb: params.cb, consumer: consumer, lastHeartbeat: Date.now(), consumerParams: params.consumerParams };
            consumer.on(HEARTBEAT, ({ timestamp }) => {
                const state = this.listenTopicHandlers[`${topic}`];
                state.lastHeartbeat = timestamp;
            });
        });
        this.detach = (service, action) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield this.listenTopicHandlers[`${service.toUpperCase()}_${action.toUpperCase()}`].consumer.pause([{ topic: `${service.toUpperCase()}_${action.toUpperCase()}` }]);
            delete this.listenTopicHandlers[`${service.toUpperCase()}_${action.toUpperCase()}`];
        });
        this.publish = (action, key, data, service) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.isProducerConnected) {
                yield this.producer.connect();
                this.isProducerConnected = true;
            }
            if (service) {
                return yield this.producer.send({ topic: `${service.toUpperCase()}_${action.toUpperCase()}`, messages: [{ key: key, value: Buffer.from(JSON.stringify(data)) }] }); //publish the message
            }
            else {
                return yield this.producer.send({ topic: `${action.toUpperCase()}`, messages: [{ key: key, value: Buffer.from(JSON.stringify(data)) }] }); //publish the message
            }
        });
        this.bulkPublish = (action, messages, service) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.isProducerConnected) {
                yield this.producer.connect();
                this.isProducerConnected = true;
            }
            if (service) {
                return yield this.producer.send({ topic: `${service.toUpperCase()}_${action.toUpperCase()}`, messages: messages }); //publish the message
            }
            else {
                return yield this.producer.send({ topic: `${action.toUpperCase()}`, messages: messages }); //publish the message
            }
        });
        this.messagesHandler = ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const { topic, messages, partition } = batch;
            // console.debug(`${topic} revived message , from offset: ${batch.firstOffset()}, to offset: ${batch.lastOffset()} message count ${messages.length}`)
            const { cb } = this.listenTopicHandlers[topic];
            const jsonBatch = messages.map((message) => {
                //@ts-ignore
                const payload = JSON.parse(message.value.toString());
                payload.technicalKey = message.key ? message.key.toString() : null;
                payload.technicalOffset = message.offset;
                payload.partition = partition;
                return payload;
            });
            yield cb(jsonBatch, heartbeat, isRunning, isStale, resolveOffset); //passed the batch to function
        });
        this.messageHandler = ({ topic, partition, message }) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const messageRetryKey = `bus:retry:partition:${partition}:offset:${message.offset}`;
            try {
                const { cb } = this.listenTopicHandlers[topic];
                if (cb) {
                    //@ts-ignore
                    const payload = JSON.parse(message.value.toString());
                    payload.technicalKey = message.key ? message.key.toString() : null;
                    payload.technicalOffset = message.offset;
                    payload.partition = partition;
                    const res = yield cb(payload);
                    const shouldPublishResult = message.key && (yield this.caching.get(`${message.key.toString()}`));
                    if (shouldPublishResult) { //check if I should publish result
                        yield this.caching.publish(`${message.key.toString()}`, res ? JSON.stringify(res) : JSON.stringify({}));
                    }
                }
                else {
                    console.warn(`consumed messages from ${topic} handler is not implemented, offset: ${message.offset}, key: ${message.key}`);
                }
                //delete if successes retry
                yield this.caching.delete(messageRetryKey);
            }
            catch (err) {
                console.error(`EventBus consumer.eachMessage error! ${err}`);
                const retryPointer = yield this.caching.get(messageRetryKey);
                if (retryPointer && +retryPointer > this.DLQ_COUNT_RETRY) {
                    const isStillNeedToPublishError = yield this.caching.get(`${message.key.toString()}`);
                    if (isStillNeedToPublishError) {
                        //will publish error to the subscriber to pop the message up to the client service
                        yield this.caching.publish(`${message.key.toString()}`, JSON.stringify({ err: err }));
                    }
                    yield this.publish(`${topic}_dlq`, message.key, message); //publish to dlq
                    yield this.caching.delete(messageRetryKey); //delete the unique key
                    console.warn(`message retry moved to ${topic}_dlq due to error: ${err}!`);
                }
                else {
                    this.caching.set(messageRetryKey, (retryPointer ? ((+retryPointer) + 1) : 1));
                    throw err;
                }
            }
        });
        this.isHealth = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return yield Object.keys(this.listenTopicHandlers).reduce((isHealthy, consumer) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                const accResolved = (yield isHealthy);
                const entity = this.listenTopicHandlers[consumer];
                const SESSION_TIMEOUT = entity.consumerParams && entity.consumerParams.sessionTimeout ? entity.consumerParams.sessionTimeout : 30000; //default value
                if (Date.now() - entity.lastHeartbeat < SESSION_TIMEOUT) {
                    return accResolved && true;
                }
                try {
                    const { state } = yield entity.consumer.describeGroup();
                    return accResolved && ['CompletingRebalance', 'PreparingRebalance'].includes(state);
                }
                catch (err) {
                    return accResolved && false;
                }
            }), Promise.resolve(true));
        });
        if (!process.env.KAFKA_GROUP)
            throw 'KAFKA_GROUP is mandatory parameter';
    }
    shutdown() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield Promise.all(Object.keys(this.listenTopicHandlers).map((key) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                return yield this.listenTopicHandlers[key].consumer.disconnect();
            })));
            //clean all listeners 
            this.listenTopicHandlers = [];
            yield this.producer.disconnect();
            yield this.admin.disconnect();
        });
    }
}
exports.KafkaQueue = KafkaQueue;
//# sourceMappingURL=kafka.queue.js.map