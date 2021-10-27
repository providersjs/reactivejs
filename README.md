# @reactivejs  :electric_plug: :desktop_computer:

### Event Bus implementation for NodeJs microservices made with :heart_on_fire: :brain: :computer:

A micro-services event bus for async/sync communication between NodeJs services - well tested in production - handles millions of events per second in stream/batch mode.
##### dependencies: [KafkaJs](https://github.com/tulios/kafkajs/), [Redis](https://github.com/redis/node-redis/), [Typescript](https://www.typescriptlang.org/)

## How it works ?

reactivejs uses **Redis** and **Kafka** as an infrastructure to pass messages and communicate between services, it provides a simple yet powerful abstraction over those tools - instead of implementing the layer of communication in every service - reactivejs wraps it for you. with reactivejs there are two ways that services can communicate - *one-way* (publish) OR *two-way* (publish-respond). All communication directions are *async non-blocking*. The package allows you to take advantage of **domain-driven-design** while keeping the source code clean and simple.  

To see an actual working example please see the following  [README.md](https://github.com/benmizrahi/reactivejs/blob/main/example/) under the example folder.

#### Design to scale
The main idea this package and any other event-driven architecture should follow is that messages are async by design and each message can be processed exactly-once. another thing to keep in maid is the ordering - when stating to implement this kind of design remember there is no ordering for consuming messages - so the publishing order will not be the order of consuming - especially with multiple replicas handling lot's of events.


#### How two-way communication works - simple but powerful:

When using the **EventBus.getAsync** method on the event bus we need somehow not only to populate the message into the relevant topic but we need also to get the respond back  and resolve the promise - to do so reactivejs uses Redis for publish-subscribe pattern. here you can see the the event-flow under the hood:

![alt text](https://github.com/benmizrahi/reactivejs/blob/main/diagram-sync-responed.png)

## Getting Started

Install the package with you're favorite package manager:
```
npm install @providersjs/reactivejs
OR
yarn add @providersjs/reactivejs
```

After having the package installed under you're project - you should define some environment variables to tell the events bus how to behave in this service - here is a list of environment variables need to be defined:

| variable| default | mandatory |  description |
|---------|-------|-----------| ------ |
| KAFKA_SERVICE_NAME | null | TRUE | the service name used in Kafka to create the consumer group and topics pattern
| KAFKA_GROUP | null | TRUE | the consumer group to use for this consuming messages from Kafka 
| KAFKA_BROKER | null | TRUE | Kafka brokers list 
| EVENT_BUS_CONNECTION_TIMEOUT| 30000 | FALSE | connectionTimeout (KafkaJs)
| EVENT_BUS_REQUEST_TIMEOUT| 30000 | FALSE | requestTimeout (KafkaJs)
| EVENT_BUS_TIME| 300 | FALSE | initialRetryTime (KafkaJs)
| EVENT_BUS_RETRY| 10 | FALSE | retries (KafkaJs)
| REDIS_HOST| localhost| TRUE | Redis communication host
| REDIS_PORT | 6379| TRUE| Redis communication port
| SCHEMA_REGISTRY_URL| null| FALSE | N/A
| RETRY_DLQ_COUNT | 3| FALSE | After the amount described here, the message/batch will pass to a dead letter queue for handling offline.

After having all mandatory environment variables defined - we can start using the package interface and communicate with the EventBus. To init the bus and start all communications via consumer/producers and Redis write the following action on you're index file to init the bus:
```
import { EventBus } from  '@reactivejs/packages'
async function run() {
   await EventBus.init()
}
run().catch(console.error)
```

### EventBus Interfaces & Methods:

##### Global Helper methods:

`init: () => Promise<this>;` - The main methods the init the bus communication with the infrastructure, Kafka (consumers/producers) and Redis.  

`healthCheck: () => Promise<any>;` - Method that checks the health of communication with the infrastructure, the check will respond with  true/false if all infrastructure is alive and stable - this method is useful for health checks via Kubernetes or any other orchestration techniques 

`shutDown: () => Promise<void>;` - In case you need to graceful shutdown the service - use this methods the close all open connections and remove work in queuing.

---

##### Communication Methods:

`getAsync: (formDomain: any, action: string, obj: {}) => Promise<any>;` - An sync method that request the publishing an event to specific domain with specific action and resolved the promise when return value received. with this technic you can communicate between service to gather information and values from different services.

#### Example: 
`const OrderEntity = await EventBus.getAsync('Orders','GET',{ payload: { id: 1 } })` 
In this case we need to implement a reactive method that listens to GET events on Orders domain and return the values needed - the return value from the reactive method will be the result of the promise `OrderEntity` variable.

---

`publishAsync: (action: string, obj: { payload: any }, toDomain?: any) => Promise<boolean>;` - this method is used to publish events to specific domain and specific action, this is a **publish** action that returns true/false if message has been sent or not.  - please notifce 

#### Example:  

`await EventBus.publishAsync('OrderPlaced',{ payload: { message: 'HelloWorld' } }, 'Order')`

`bulkPublishAsync: (action: string, messages: { payload: any }[], formDomain?: any) => Promise<boolean>;` - Same as the above method but using a batch sending of messages - this way you can send batch of messages to specific domain on specific action.
#### Example:  

`await EventBus.publishAsync('OrderPlaced',[{ payload: { message: 'HelloWorld' } }], 'Order')`

---
### Make A Service Reactive:

All of the above methods are publishing methods - now let's make the service react to events - for this purpose, reactivejs provides a decorator for method that warps a method and trigger the method when there is a new event coming in on the specific domain and on the specific action - this idea behind this decorator is to think about events as we think about HTTP requests - in HTTP server like Express we define a route and bind a message to it - the reaction of the method will be the output of the server in this route - the same goes with reactivejs, by defining a @ActionReactive method we bing the warped method to the action of handling events.

``` 
@ActionReact  - input object interfaces: 

interface IBusReactiveParams {

  // Domain of this action, not mendetory means that we can react to global actions.
  domain?: string 

  // The action that this method will be handle.
  action: string

  // Should reset the consumer to latest offset in the topic
  resetToLatest?: boolean;

  //should reset the consumer to earliest in the topic
  resetToEarliest?: boolean;

  //Auto create topic - if needed.
  autoCreate?: boolean;

  // number of partitions for this topic (default 7)
  numberOfPartitions?: number

  //nu,ber of replication for this topic (default 3)
  replicationFactor?: number

  // allow the message to get an array of json message
  // ** important in this case the message results will not be handled.
  // the client need to publish messages via the EventBus
  isBatch?: boolean;

  //Defined in [KafkaJs](https://kafka.js.org/docs/consuming#a-name-options-a-options)
  consumerParams?:any

  //JSON orAVRO
  //Default message format is
  messageFormat?: MessageFormat;
}

export interface IEventBusMessage {

  //UUID of this message - alow you to create an idempotent action to resolve duplications and issues. 
  id: string
 
  //The unique key of the message in the underline system (Kafka == message.key)
  technicalKey:string;
 
  //The unique offset of the message in the underline system (Kafka == message.offset)
  technicalOffset:string;
 
  //The partitions that the message comes from in underline system (Kafka == partition)
  partition:number;
 
  // a generic JSON object holding all the data passed in this particular message you can destruct the message to get the values
  payload: any
}
```

In case the flag isBatch == true then the event bus will pass multiple extended methods that will help you doing processing the data coming in and make sure the consumer is stable - 

```
messages: IEventBusMessage[] - the actual batch of data

heartbeat() - use await heartbeat() to make kafka know that the consumer is still alive - useful in case of have an intensive work to do on the batch (foreach/map) operation, in this case make sure you call await heartbeat() on each interval.

isRunning() - checks whether the consumer instance is still running - it's important to check that because we won't be able to commit the offset if the consumer is not running

resolveOffset() - will resolve the message in Kafka for this consumer group, execute this method when processing done only - to avoid data loss.
```


For example the following method wraps the submitted method and binds in to the action: **submitted** on the **orders** domain.

```
import { EventBus, ActionReact, IEventBusMessage } from  '@reactivejs/packages'

//single action per message in the topic
@ActionReact({ action: 'submitted', domain: 'orders' })
submitted = (message: IEventBusMessage) => {
  const { message } = message.payload
  console.log(message) // only handles the message no return value
}

//handle batch of messages in the topic
@ActionReact({ action: 'submitted', domain: 'orders', isBatch: true })
submitted = (messages: IEventBusMessage[],heartbeat , isRunning, isStale, resolveOffset) => {
  for (const message in messages) {
    const { message } = message.payload
    console.log(message) // only handles the message no return value
    resolveOffset(message.technicalOffset); //commit the message to Kafka
    await heartbeat();
  }
}

@ActionReact({ action: 'get', domain: 'orders' })
submitted = (message: IEventBusMessage) => {
  const { message } = message.payload
  return 'message + get'  // will be the result of the request via asyncGet
}
```

## Contributing :handshake:

If you'd like to contribute, check out the  [contributing guide](https://github.com/benmizrahi/reactivejs/CONTRIBUTING.md).


## License

This repository is licensed under the " Apache-2.0 License". See  [LICENSE](https://github.com/benmizrahi/reactivejs/LICENSE).