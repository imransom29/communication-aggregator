import winston from 'winston';
import Transport from 'winston-transport';
import axios from 'axios';
import { config } from '../config';
import { LogEntry } from '../types';

const { combine, timestamp, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, traceId, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}] [${traceId || 'N/A'}]: ${message} ${metaStr}`;
});

// Custom transport to send logs to logging service
class LoggingServiceTransport extends Transport {
  async log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      const logEntry: LogEntry = {
        level: info.level as any,
        message: info.message,
        service: 'delivery-service',
        traceId: info.traceId || 'unknown',
        timestamp: info.timestamp,
        metadata: {
          ...info,
          level: undefined,
          message: undefined,
          timestamp: undefined,
          traceId: undefined
        }
      };

      await axios.post(`${config.loggingService.url}/api/logs`, logEntry, {
        timeout: 2000
      }).catch(err => {
        // Silently fail if logging service is down
        console.error('Failed to send log to logging service:', err.message);
      });
    } catch (error) {
      // Don't let logging errors crash the app
    }

    callback();
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp(), consoleFormat)
  })
];

// Add logging service transport in production
if (config.nodeEnv !== 'test') {
  transports.push(new LoggingServiceTransport());
}

export const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: combine(timestamp(), json()),
  defaultMeta: { service: 'delivery-service' },
  transports
});

// Helper to create child logger with traceId
export const createLogger = (traceId: string) => {
  return logger.child({ traceId });
};
