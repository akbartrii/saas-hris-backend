import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateOvernightDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Shift type', example: 'night_shift' })
  @IsString()
  @IsNotEmpty()
  shift_type: string;

  @ApiPropertyOptional({ description: 'Remarks / reason' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
