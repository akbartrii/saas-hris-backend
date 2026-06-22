import {
  ValidationPipe as NestValidationPipe,
  ValidationError,
  BadRequestException,
} from '@nestjs/common';

export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));

        return new BadRequestException({
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          details: formattedErrors,
        });
      },
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }
}
