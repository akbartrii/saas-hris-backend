import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const dsn = this.configService.get('SENTRY_DSN');
    if (dsn) {
      Sentry.init({
        dsn,
        environment: this.configService.get('NODE_ENV', 'development'),
        tracesSampleRate: this.configService.get('NODE_ENV') === 'production' ? 0.1 : 0.0,
        integrations: [],
      });
      this.logger.log('Sentry initialized');
    } else {
      this.logger.warn('SENTRY_DSN not configured — Sentry disabled');
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureMessage(message, level);
    });
  }

  setUser(userId: string, email?: string) {
    Sentry.setUser({ id: userId, email });
  }

  clearUser() {
    Sentry.setUser(null);
  }
}
