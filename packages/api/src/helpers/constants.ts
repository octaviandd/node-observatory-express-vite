export const PERIODS : {[key: string]: {duration: number, interval : string, config: { minute: string, second: string, weekday?: string }}} = {
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