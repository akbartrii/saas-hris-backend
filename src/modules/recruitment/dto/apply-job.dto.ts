import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class ApplyJobDto {
  @ApiProperty({ description: 'Job posting UUID' })
  @IsUUID()
  @IsNotEmpty()
  job_posting_id: string;

  @ApiProperty({ description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Resume URL' })
  @IsString()
  @IsOptional()
  resume_url?: string;

  @ApiPropertyOptional({ description: 'Cover letter' })
  @IsString()
  @IsOptional()
  cover_letter?: string;
}
