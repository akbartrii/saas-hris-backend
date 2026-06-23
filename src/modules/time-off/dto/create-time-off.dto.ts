import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTimeOffDto {
  @ApiProperty({ description: "Time off type ID" })
  @IsUUID()
  time_off_type_id: string;

  @ApiProperty({ description: "Start date (YYYY-MM-DD)" })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: "End date (YYYY-MM-DD)" })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: "Start time (HH:mm)" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  start_time?: string;

  @ApiPropertyOptional({ description: "End time (HH:mm)" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  end_time?: string;

  @ApiProperty({ description: "Reason for time off" })
  @IsString()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ description: "Work handover to employee ID" })
  @IsOptional()
  @IsUUID()
  work_handover_to?: string;

  @ApiPropertyOptional({ description: "Employee ID (for admin submission)" })
  @IsOptional()
  @IsUUID()
  employee_id?: string;

  @ApiPropertyOptional({ description: "Attachment URL (optional)" })
  @IsOptional()
  @IsString()
  attachment_url?: string;
}
