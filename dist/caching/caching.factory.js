"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caching = void 0;
const redis_cache_1 = require("./redis.cache");
function caching(type) {
    return new redis_cache_1.RedisCache();
}
exports.caching = caching;
//# sourceMappingURL=caching.factory.js.map