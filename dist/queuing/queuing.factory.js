"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queuing = void 0;
const kafka_queue_1 = require("./kafka.queue");
function queuing(type, caching) {
    return new kafka_queue_1.KafkaQueue(caching);
}
exports.queuing = queuing;
//# sourceMappingURL=queuing.factory.js.map