import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: pino.Logger;

  constructor() {
    const isDev = process.env.NODE_ENV === 'development';
    this.logger = pino({
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      transport: isDev
        ? { target: 'pino/file', options: { destination: 1 } }
        : undefined,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          'password',
          'password_hash',
          'token',
          'authorization',
          'secret',
          'apiKey',
          'base_salary',
          'fixed_allowance',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  log(message: any, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: any, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: any, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace({ context }, message);
  }

  fatal(message: any, trace?: string) {
    this.logger.fatal({ trace }, message);
  }

  getPino(): pino.Logger {
    return this.logger;
  }
}
