import winston from "winston";
import path from "path";

const { combine, timestamp, json, errors, prettyPrint } = winston.format;

const logsDir = process.env.LOGS_DIR || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json({space: 2})
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp({ format: 'HH:mm:ss' }),
      errors({ stack: true }),
      prettyPrint({ colorize: true })
    ),
  }));
}

export default logger;