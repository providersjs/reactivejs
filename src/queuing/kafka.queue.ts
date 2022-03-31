import { Kafka, logLevel, Batch, KafkaMessage } from 'kafkajs'
import { ICaching } from '../caching/caching.factory';
import { IBusReactiveParams } from '../models/IBusReactiveParams';
import { IQueue } from './queuing.factory'
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry'

export class KafkaQueue implements IQueue {

  //@ts-ignore
  private registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL })
  private isProducerConnected = false;
  private DEFAULT_NUMBER_OF_PARTITIONS = 7;
  private DEFAULT_REPLICATION_FACTOR = 3;
  private DLQ_COUNT_RETRY = +(process.env.RETRY_DLQ_COUNT as string) || 3
  private listenTopicHandlers = {}
  kafka = new Kafka({
    clientId: 'api',
    brokers: [process.env.KAFKA_BROKER as string],
    connectionTimeout: +(process.env.EVENT_BUS_CONNECTION_TIMEOUT as string) || 30000,
    requestTimeout: +(process.env.EVENT_BUS_REQUEST_TIMEOUT as string) || 30000,
    retry: {
      //@ts-ignore
      initialRetryTime: (+process.env.EVENT_BUS_TIME || 300),
      //@ts-ignore
      retries: (+process.env.EVENT_BUS_RETRY || 10)
    },
    logLevel: logLevel.ERROR
  });

  admin = this.kafka.admin({})
  private fromBeginningConsumer = process.env.FROM_BEGINNING == "1" ? true : false
  private producer = this.kafka.producer();

  constructor(private readonly caching: ICaching) {
    if (!process.env.KAFKA_GROUP) throw 'KAFKA_GROUP is mandatory parameter'
  }

  registerSchema = async (schemas: string[]) => {
    await Promise.all(schemas.map(async (schema) => {
      return await this.registry.register({ type: SchemaType.AVRO, schema })
    }))
  }

  generateSchemas = async (services: string[]) => {
    const schema = await Promise.all(services.map(async (service) => {
      const id = await this.registry.getLatestSchemaId(service)
      return await this.registry.getSchema(id)
    }))

    return schema;
  }

  attach = async (params: IBusReactiveParams) => {

    let topic = `${params.action.toUpperCase()}`;
    if (params.domain) {
      topic = `${params.domain.toUpperCase()}_${topic}`
    }
    try {
      //first create the topic
      const topics = await this.admin.listTopics()
      if (topics.indexOf(`${topic}`) == -1) {
        await this.admin.createTopics({ topics: [{ topic: `${topic}`, numPartitions: (params.numberOfPartitions || this.DEFAULT_NUMBER_OF_PARTITIONS), replicationFactor: (params.replicationFactor || this.DEFAULT_REPLICATION_FACTOR) }] })
      }
    }
    catch (err) { }

    const groupId = `${(process.env.KAFKA_GROUP as string).toUpperCase()}_${topic}`;

    try {
      if (params.resetToLatest) {
        await this.admin.resetOffsets({ groupId, topic, earliest: false })
      } else if (params.resetToEarliest) {
        await this.admin.resetOffsets({ groupId, topic, earliest: true })
      }
    }
    catch (err) {
      console.warn(`unable to reset offsets ${err}`);
    }

    //then consume messages
    const consumer = this.kafka.consumer({ groupId, allowAutoTopicCreation: true, ...params.consumerParams });
    await consumer.connect();
    await consumer.subscribe({ topic: `${topic}`, fromBeginning: params.fromBeginningConsumer ? params.fromBeginningConsumer : this.fromBeginningConsumer }); //attach to kafka topic
    const { HEARTBEAT } = consumer.events
    if (params.isBatch) {
      await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: this.messagesHandler
      })
    } else {
      await consumer.run({
        eachMessage: this.messageHandler,
      })
    }
    this.listenTopicHandlers[`${topic}`] = { cb: params.cb, consumer: consumer, lastHeartbeat: Date.now(), consumerParams: params.consumerParams }
    consumer.on(HEARTBEAT, ({ timestamp }) => {
      const state = this.listenTopicHandlers[`${topic}`];
      state.lastHeartbeat = timestamp
    })
  }

  detach = async (service, action) => {
    await this.listenTopicHandlers[`${service.toUpperCase()}_${action.toUpperCase()}`].consumer.pause([{ topic: `${service.toUpperCase()}_${action.toUpperCase()}` }])
    delete this.listenTopicHandlers[`${service.toUpperCase()}_${action.toUpperCase()}`]
  }

  publish = async (action, key, data, service?) => {
    if (!this.isProducerConnected) {
      await this.producer.connect();
      this.isProducerConnected = true;
    }
    if (service) {
      return await this.producer.send({ topic: `${service.toUpperCase()}_${action.toUpperCase()}`, messages: [{ key: key, value: Buffer.from(JSON.stringify(data)) }] }) //publish the message
    } else {
      return await this.producer.send({ topic: `${action.toUpperCase()}`, messages: [{ key: key, value: Buffer.from(JSON.stringify(data)) }] }) //publish the message
    }
  }

  bulkPublish = async (action, messages: any[], service?) => {
    if (!this.isProducerConnected) {
      await this.producer.connect();
      this.isProducerConnected = true;
    }
    if (service) {
      return await this.producer.send({ topic: `${service.toUpperCase()}_${action.toUpperCase()}`, messages: messages }) //publish the message
    } else {
      return await this.producer.send({ topic: `${action.toUpperCase()}`, messages: messages }) //publish the message
    }
  }

  async shutdown() {
    await Promise.all(Object.keys(this.listenTopicHandlers).map(async (key) => {
      return await this.listenTopicHandlers[key].consumer.disconnect();
    }))
    //clean all listeners 
    this.listenTopicHandlers = []
    await this.producer.disconnect();
    await this.admin.disconnect();

  }

  private messagesHandler = async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
    const { topic, messages, partition }: { topic: string, messages: KafkaMessage[], partition: number } = batch;
    // console.debug(`${topic} revived message , from offset: ${batch.firstOffset()}, to offset: ${batch.lastOffset()} message count ${messages.length}`)
    const { cb } = this.listenTopicHandlers[topic]
    const jsonBatch = messages.map((message) => {
      //@ts-ignore
      const payload = JSON.parse(message.value.toString())
      payload.technicalKey = message.key ? message.key.toString() : null;
      payload.technicalOffset = message.offset;
      payload.partition = partition;
      return payload;
    })
    await cb(jsonBatch, heartbeat, isRunning, isStale, resolveOffset) //passed the batch to function
  }

  private messageHandler = async ({ topic, partition, message }: { topic: string, partition: number, message: KafkaMessage }) => {
    const messageRetryKey = `bus:retry:partition:${partition}:offset:${message.offset}`
    try {
      const { cb } = this.listenTopicHandlers[topic]
      if (cb) {
        //@ts-ignore
        const payload = JSON.parse(message.value.toString())
        payload.technicalKey = message.key ? message.key.toString() : null;
        payload.technicalOffset = message.offset;
        payload.partition = partition;
        const res = await cb(payload)
        const shouldPublishResult = message.key && await this.caching.get(`${message.key.toString()}`)
        if (shouldPublishResult) {//check if I should publish result
          await this.caching.publish(`${message.key.toString()}`,res ? JSON.stringify(res) : JSON.stringify({}));
        }
      }
      else {
        console.warn(`consumed messages from ${topic} handler is not implemented, offset: ${message.offset}, key: ${message.key}`)
      }
      //delete if successes retry
      await this.caching.delete(messageRetryKey)
    }
    catch (err) {
      console.error(`EventBus consumer.eachMessage error! ${err}`)
      const retryPointer = await this.caching.get(messageRetryKey)
      if (retryPointer && +retryPointer > this.DLQ_COUNT_RETRY) {
        const isStillNeedToPublishError = await this.caching.get(`${message.key.toString()}`)
        if (isStillNeedToPublishError) {
          //will publish error to the subscriber to pop the message up to the client service
          await this.caching.publish(`${message.key.toString()}`, JSON.stringify({ err: err }));
        }
        await this.publish(`${topic}_dlq`, message.key, message) //publish to dlq
        await this.caching.delete(messageRetryKey) //delete the unique key
        console.warn(`message retry moved to ${topic}_dlq due to error: ${err}!`)
      } else {
        this.caching.set(messageRetryKey, (retryPointer ? ((+retryPointer) + 1) : 1))
        throw err;
      }
    }
  }

  isHealth = async () => {
    return await Object.keys(this.listenTopicHandlers).reduce(async (isHealthy, consumer) => {
      const accResolved = (await isHealthy);
      const entity = this.listenTopicHandlers[consumer];
      const SESSION_TIMEOUT = entity.consumerParams && entity.consumerParams.sessionTimeout ? entity.consumerParams.sessionTimeout : 30000 //default value
      if (Date.now() - entity.lastHeartbeat < SESSION_TIMEOUT) {
        return accResolved && true
      }
      try {
        const { state } = await entity.consumer.describeGroup()
        return accResolved && ['CompletingRebalance', 'PreparingRebalance'].includes(state)
      } catch (err) {
        return accResolved && false
      }
    }, Promise.resolve(true))
  }

}