import * as crypto from 'crypto';
if (typeof (globalThis as any).crypto === 'undefined') {
  (globalThis as any).crypto = crypto;
}

import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ValidationPipe } from './common/pipes/validation.pipe';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

import pino from 'pino';

const bootstrapLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key] === '',
  );
  if (missing.length > 0) {
    bootstrapLogger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, apikey',
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('HRIS Samugara API')
    .setDescription('HRIS Samugara Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Cron-Secret', in: 'header' }, 'x-cron-secret')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  bootstrapLogger.info(`Application is running on: http://localhost:${port}/api/v1`);
  bootstrapLogger.info(`Swagger docs available at: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
