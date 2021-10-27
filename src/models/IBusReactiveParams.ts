export interface IBusReactiveParams {
  domain?: string,
  action: string,
  fromBeginningConsumer?: boolean,
  resetToLatest?: boolean;
  resetToEarliest?: boolean;
  autoCreate?: boolean;
  numberOfPartitions?: number
  replicationFactor?: number
  expectedEventSchema?: any
  // allow the message to get an array of json message 
  // ** important in this case the message results will not be handled.
  // the client need to publish messages via the EventBus
  isBatch?: boolean;
  cb?: (k, m) => any;
  consumerParams?:any
  //Default message format is JSON
  messageFormat?: MessageFormat;
}

export enum MessageFormat {
  Json = 1,
  AVRO = 2
}
