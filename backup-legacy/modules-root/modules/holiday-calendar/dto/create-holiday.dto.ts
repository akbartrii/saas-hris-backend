import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Company UUID' })
  @IsUUID()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({ description: 'Holiday date (ISO string)' })
  @IsDateString()
  @IsNotEmpty()
  holiday_date: string;

  @ApiProperty({ description: 'Holiday name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Holiday type (e.g. national, company)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Is recurring annually' })
  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @ApiProperty({ description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year: number;
}
