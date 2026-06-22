import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveDto {
  @ApiProperty({ description: 'Leave type ID' })
  @IsUUID()
  leave_type_id: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: 'Total days' })
  @IsInt()
  @Min(1)
  total_days: number;

  @ApiProperty({ description: 'Reason for leave' })
  @IsString()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ description: 'Work handover to employee ID' })
  @IsOptional()
  @IsUUID()
  work_handover_to?: string;

  @ApiPropertyOptional({ description: 'Employee ID (for admin submission)' })
  @IsOptional()
  @IsUUID()
  employee_id?: string;

  @ApiPropertyOptional({ description: 'Attachment URL (optional)' })
  @IsOptional()
  @IsString()
  attachment_url?: string;
}
