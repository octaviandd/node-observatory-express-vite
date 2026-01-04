export const PERIODS : Record<string, {duration: number, interval : string, config: { minute: string, second: string, weekday?: string }}> = {
  "1h": {
    duration: 60,
    interval: "INTERVAL 1 HOUR",
    config: { minute: "2-digit", second: "2-digit" }
  },
  "24h": {
    duration: 24 * 60,
    interval: "INTERVAL 1 DAY",
    config: { minute: "2-digit", second: "2-digit" }
  },
  "7d": {
    duration: 7 * 24 * 60,
    interval: "INTERVAL 7 DAY",
    config: { minute: "2-digit", second: "2-digit", weekday: 'short' }
  },
  "14d": {
    duration: 14 * 24 * 60,
    interval: "INTERVAL 14 DAY",
    config: { minute: "2-digit", second: "2-digit", weekday: 'short' }
  },
  "30d": {
    duration: 30 * 24 * 60,
    interval: "INTERVAL 30 DAY",
    config: { minute: "2-digit", second: "2-digit", weekday: 'short' }
  }
};

/** @format */

/**
 * Redis commands and their arguments
 */
export const redisCommandArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  set: ["key", "value"],
  GET: ["key"],
  SET: ["key", "value"],
  // mGet: ["key"],
  // mSet: ["key"],
  // HSET: ["hash", "field", "value"],
  // hSet: ["hash", "field", "value"],
  // HGET: ["hash", "field"],
  // hGet: ["hash", "field"],
  // HGETALL: ["hash"],
  // hGetAll: ["hash"],
  DEL: ["key"],
  del: ["key"],
  EXISTS: ["key"],
  exists: ["key"],
  // INCR: ["key"],
  // incr: ["key"],
  // DECR: ["key"],
  // decr: ["key"],
  APPEND: ["key", "value"],
  append: ["key", "value"],
  // HDEL: ["hash", "field"],
  // hDel: ["hash", "field"],
  // HEXISTS: ["hash", "field"],
  // hExists: ["hash", "field"],
  // HINCRBY: ["hash", "field", "increment"],
  // hIncrBy: ["hash", "field", "increment"],
  // HLEN: ["hash"],
  // hLen: ["hash"],
  // LPUSH: ["key", "value"],
  // lPush: ["key", "value"],
  // LPOP: ["key"],
  // lPop: ["key"],
  // LLEN: ["key"],
  // lLen: ["key"],
  // LINDEX: ["key", "index"],
  // lIndex: ["key", "index"],
  // RPUSH: ["key", "value"],
  // rPush: ["key", "value"],
  // RPOP: ["key"],
  // rPop: ["key"],
  // SADD: ["key", "value"],
  // sAdd: ["key", "value"],
  // SREM: ["key", "value"],
  // sRem: ["key", "value"],
  // SCARD: ["key"],
  // sCard: ["key"],
  // SMEMBERS: ["key"],
  // sMembers: ["key"],
  // ZADD: ["key", "score", "value"],
  // zAdd: ["key", "score", "value"],
  // ZREM: ["key", "value"],
  // zRem: ["key", "value"],
  // ZCARD: ["key"],
  // zCard: ["key"],
  // ZRANGE: ["key", "start", "stop"],
  // zRange: ["key", "start", "stop"],
  // ZRANK: ["key", "member"],
  // zRank: ["key", "member"],
  // ZSCORE: ["key", "member"],
  // zScore: ["key", "member"],
  // ZREVRANK: ["key", "member"],
  // zRevRank: ["key", "member"],
  // ZINCRBY: ["key", "increment", "member"],
  // zIncrBy: ["key", "increment", "memberex"],
});

/**
 * Node cache commands and their arguments
 */
export const nodeCacheCommandsArgs: { [key: string]: string[] } = Object.freeze(
  {
    // Read operations (hits/misses)
    get: ["key"],
    // mget: ["key"],
    has: ["key"],

    // Write operations
    set: ["key", "value"],
    // mset: ["key"],
    del: ["key"],
    take: ["key"],

    // Special operations that still fit our paradigm
    // flushAll: [],
  },
);

/**
 * IO Redis commands and their arguments
 */
export const ioRedisCommandsArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  set: ["key", "value"],
  // mget: ["key"],
  // mset: ["key"],
  // hset: ["hash", "field", "value"],
  // hget: ["hash", "field"],
  // hgetall: ["hash"],
  del: ["key"],
  exists: ["key"],
  // incr: ["key"],
  // decr: ["key"],
  // append: ["key", "value"],
  // hdel: ["hash", "field"],
  // hexists: ["hash", "field"],
  // hincrby: ["hash", "field", "increment"],
  // hlen: ["hash"],
  // lpush: ["key", "value"],
  // lopo: ["key"],
  // llen: ["key"],
  // lindex: ["key", "index"],
  // rpush: ["key", "value"],
  // rpop: ["key"],
  // sadd: ["key", "value"],
  // srem: ["key", "value"],
  // scard: ["key"],
  // smembers: ["key"],
  // zadd: ["key", "score", "value"],
  // zrem: ["key", "value"],
  // zcard: ["key"],
  // zrange: ["key", "start", "stop"],
  // zrank: ["key", "member"],
  // zscore: ["key", "member"],
  // zrevrank: ["key", "member"],
  // zincrby: ["key", "increment", "member"],
});

export const levelDBCommandsArgs: { [key: string]: string[] } = Object.freeze({
  get: ["key"],
  put: ["key", "value"],
  del: ["key"],
});

/**
 * A mapping of LRU Cache methods to their argument names.
 * Extend or modify as needed.
 */
export const LRUCacheCommandArgsMapping: { [key: string]: string[] } = {
  get: ["key"],
  set: ["key", "value"],
  has: ["key"],
  del: ["key"],
};


export const PATCHERS_GLOBAL_SYMBOLS = {
  WINSTON_PATCHED_SYMBOL: Symbol.for("node-observer:winston-patched"),
  UNDICI_PATCHED_SYMBOL: Symbol.for("node-observer:undici-patched"),
  TYPEORM_PATCHED_SYMBOL: Symbol.for("node-observer:typeorm-patched"),
  SQLITE3_PATCHED_SYMBOL: Symbol.for("node-observer:sqlite3-patched"),
  SIGNALE_PATCHED_SYMBOL : Symbol.for("node-observer:signale-patched"),
  SEQUELIZE_PATCHED_SYMBOL : Symbol.for("node-observer:sequelize-patched"),
  SENDGRID_PATCHED_SYMBOL : Symbol.for("node-observer:sendgrid-patched"),
  REDIS_PATCHED_SYMBOL: Symbol.for("node-observer:redis-patched"),
  PUSHER_PATCHED_SYMBOL : Symbol.for("node-observer:pusher-patched"),
  PRISMA_PATCHED_SYMBOL : Symbol.for("node-observer:prisma-patched"),
  POSTMARK_PATCHED_SYMBOL : Symbol.for("node-observer:postmark-patched"),
  PINO_PATCHED_SYMBOL : Symbol.for("node-observer:pino-patched"),
  PG_PATCHED_SYMBOL : Symbol.for("node-observer:pg-patched"),
  NODEMAILER_PATCHED_SYMBOL : Symbol.for("node-observer:nodemailer-patched"),
  NODESCHEDULE_PATCHED_SYMBOL : Symbol.for("node-observer:nodeschedule-patched"),
  NODECRON_PATCHED_SYMBOL : Symbol.for("node-observer:nodecron-patched"),
  NODECACHE_PATCHED_SYMBOL : Symbol.for("node-observer:nodecache-patched"),
  MYSQL2_PATCHED_SYMBOL : Symbol.for("node-observer:mysql2-patched"),
  MYSQL_PATCHED_SYMBOL : Symbol.for("node-observer:mysql-patched"),
  MONGOOSE_PATCHED_SYMBOL : Symbol.for("node-observer:mongoose-patched"),
  MEMJS_PATCHED_SYMBOL : Symbol.for("node-observer:memjs-patched"),
  MAILGUN_PATCHED_SYMBOL : Symbol.for("node-observer:mailgun-patched"),
  LRUCACHE_PATCHED_SYMBOL : Symbol.for("node-observer:lrucache-patched"),
  LOGLEVEL_PATCHED_SYMBOL : Symbol.for("node-observer:loglevel-patched"),
  LOG4JS_PATCHED_SYMBOL : Symbol.for("node-observer:log4js-patched"),
  LEVEL_PATCHED_SYMBOL : Symbol.for("node-observer:level-patched"),
  KNEX_PATCHED_SYMBOL : Symbol.for("node-observer:knex-patched"),
  KEYV_PATCHED_SYMBOL : Symbol.for("node-observer:keyv-patched"),
  IOREDIS_PATCHED_SYMBOL : Symbol.for("node-observer:ioredis-patched"),
  HTTP_PATCHED_SYMBOL : Symbol.for("node-observer:http-patched"),
  FETCH_PATCHED_SYMBOL : Symbol.for("node-observer:fetch-patched"),
  EXPRESS_PATCHED_SYMBOL : Symbol.for("node-observer:express-patched"),
  EXCEPTIONS_PATCHED_SYMBOL : Symbol.for("node-observer:exceptions-patched"),
  BUNYAN_PATCHED_SYMBOL : Symbol.for("node-observer:bunyan-patched"),
  BULL_PATCHED_SYMBOL : Symbol.for("node-observer:bull-patched"),
  BREE_PATCHED_SYMBOL : Symbol.for("node-observer:bree-patched"),
  AXIOS_PATCHED_SYMBOL : Symbol.for("node-observer:axios-patched"),
  AWS_SES_PATCHED_SYMBOL : Symbol.for("node-observer:aws-ses-patched"),
  AGENDA_PATCHED_SYMBOL : Symbol.for("node-observer:agenda-patched"),
  ABLY_PATCHED_SYMBOL : Symbol.for("node-observer:ably-patched"),
} as const;