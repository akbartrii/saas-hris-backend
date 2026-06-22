import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTenantDto {
  @ApiProperty({ example: 'PT Maju Jaya Sejahtera' })
  @IsString()
  @MinLength(3)
  company_name: string;

  @ApiProperty({ example: 'admin@majujaya.com' })
  @IsEmail()
  admin_email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  admin_password: string;

  @ApiPropertyOptional({ example: '+6281234567890' })
  @IsString()
  @IsOptional()
  company_phone?: string;

  @ApiPropertyOptional({ example: 'Jl. Sudirman No. 123, Jakarta' })
  @IsString()
  @IsOptional()
  company_address?: string;
}
