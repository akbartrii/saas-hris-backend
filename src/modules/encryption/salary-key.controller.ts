import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { EncryptionService } from './encryption.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsNumber, IsOptional, MinLength } from 'class-validator';

class GenerateKeycodeDto {
  @IsString()
  @MinLength(4)
  keycode: string;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsNumber()
  year?: number;
}

class RotateKeycodeDto {
  @IsString()
  @MinLength(4)
  oldKeycode: string;

  @IsString()
  @MinLength(4)
  newKeycode: string;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsNumber()
  year?: number;
}

class ValidateKeycodeDto {
  @IsString()
  @MinLength(4)
  keycode: string;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsNumber()
  year?: number;
}

@ApiTags('Salary Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager_hrga', 'hrd', 'admin', 'super_admin')
@Controller('salary-keys')
export class SalaryKeyController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new salary encryption keycode for the month' })
  async generateKeycode(@Body() dto: GenerateKeycodeDto) {
    if (!dto.keycode || dto.keycode.trim().length < 4) {
      throw new BadRequestException('Keycode must be at least 4 characters long.');
    }
    await this.encryptionService.generateKeycode(dto.keycode, dto.month, dto.year);
    return {
      message: 'Keycode generated successfully and legacy salary data initialized.',
    };
  }

  @Post('rotate')
  @ApiOperation({ summary: 'Rotate the monthly keycode and re-encrypt all salaries' })
  async rotateKeycode(@Body() dto: RotateKeycodeDto) {
    if (!dto.oldKeycode || !dto.newKeycode) {
      throw new BadRequestException('Both old and new keycodes are required.');
    }
    if (dto.newKeycode.trim().length < 4) {
      throw new BadRequestException('New keycode must be at least 4 characters long.');
    }
    await this.encryptionService.rotateKeycode(dto.oldKeycode, dto.newKeycode, dto.month, dto.year);
    return {
      message: 'Keycode rotated successfully and all employee salaries re-encrypted.',
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate if the provided keycode is correct' })
  async validateKeycode(@Body() dto: ValidateKeycodeDto) {
    if (!dto.keycode) {
      throw new BadRequestException('Keycode is required for validation.');
    }
    const isValid = await this.encryptionService.validateKeycode(dto.keycode, dto.month, dto.year);
    return {
      valid: isValid,
    };
  }
}
