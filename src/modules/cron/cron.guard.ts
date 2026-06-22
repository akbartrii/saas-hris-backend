import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CronGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.headers['x-cron-secret'] as string | undefined;

    const expected = this.configService.get<string>('CRON_SECRET');

    if (!expected) {
      throw new UnauthorizedException('Cron secret not configured');
    }

    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    return true;
  }
}
