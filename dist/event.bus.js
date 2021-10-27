"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const tslib_1 = require("tslib");
const caching_factory_1 = require("./caching/caching.factory");
const queuing_factory_1 = require("./queuing/queuing.factory");
class EventBusHandler {
    constructor() {
        this.dryRun = false;
        this.init = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            yield this.caching.init();
            return this;
        });
        this.reactiveAttach = (params) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.dryRun)
                return;
            yield this.queue.attach(params);
        });
        this.publishAsync = (action, obj, toDomain) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.dryRun)
                return true;
            return yield this.queue.publish(action, this.uuidv4(), obj, toDomain);
        });
        this.bulkPublishAsync = (action, messages, toDomain) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.dryRun)
                return true;
            const formattedMessages = messages.map((message) => {
                return {
                    key: this.uuidv4(),
                    value: Buffer.from(JSON.stringify(message))
                };
            });
            return yield this.queue.bulkPublish(action, formattedMessages, toDomain);
        });
        this.getAsync = (formDomain, action, obj, timeout = 30000) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.dryRun)
                return;
            return new Promise((resolve, reject) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                const key = this.uuidv4(); //message key;
                const messageKey = `service:${process.env.KAFKA_SERVICE_NAME}:key:${key}`;
                yield this.caching.set(messageKey, "-1"); //set empty value and wait for response;
                this.caching.registerOnChange(messageKey, (value, error) => {
                    this.caching.delete(messageKey);
                    if (error)
                        reject(new Error(error));
                    resolve(value);
                });
                yield this.queue.publish(action, messageKey, obj, formDomain); //publish message to the queue
                setTimeout(() => {
                    const errorMessage = `request timeout ${timeout} exceeded`;
                    this.caching.unRegisterOnChange(messageKey);
                    this.caching.delete(messageKey);
                    reject(new Error(errorMessage));
                }, timeout);
            }));
        });
        this.shutDown = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (this.dryRun)
                return;
            yield this.queue.shutdown();
            yield this.caching.shutdown();
        });
        this.uuidv4 = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        this.healthCheck = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const isQueueHealth = yield this.queue.isHealth();
            const isCachingHealth = yield this.caching.isHealth();
            return isQueueHealth && isCachingHealth;
        });
        this.dryRun = process.env.EVENT_BUS_DRY == "1" ? true : false;
        if (!this.dryRun) {
            this.caching = (0, caching_factory_1.caching)("redis");
            this.queue = (0, queuing_factory_1.queuing)("kafka", this.caching);
        }
    }
}
exports.EventBus = new EventBusHandler();
//# sourceMappingURL=event.bus.js.map