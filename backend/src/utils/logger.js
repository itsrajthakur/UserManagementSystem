const winston = require('winston');
const { nodeEnv, isProd } = require('../config/env');

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: nodeEnv !== 'production' }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level: lvl, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${lvl}]: ${stack || message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format,
  transports: [
    new winston.transports.Console({
      format: isProd ? format : consoleFormat,
    }),
  ],
});

module.exports = logger;
