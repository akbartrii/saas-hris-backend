import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  Matches,
} from "class-validator";

export class CreateWorkScheduleDto {
  @ApiProperty({ description: "Schedule name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Shift code" })
  @IsString()
  @IsOptional()
  shift_code?: string;

  @ApiProperty({ description: "Schedule type (normal, ramadhan, shift)" })
  @IsString()
  @IsNotEmpty()
  schedule_type: string;

  @ApiPropertyOptional({ description: "Start time (HH:mm:ss)" })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "start_time must be in HH:mm or HH:mm:ss format",
  })
  start_time?: string;

  @ApiPropertyOptional({ description: "End time (HH:mm:ss)" })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "end_time must be in HH:mm or HH:mm:ss format",
  })
  end_time?: string;

  @ApiPropertyOptional({ description: "Break start time (HH:mm:ss)" })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "break_start must be in HH:mm or HH:mm:ss format",
  })
  break_start?: string;

  @ApiPropertyOptional({ description: "Break end time (HH:mm:ss)" })
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "break_end must be in HH:mm or HH:mm:ss format",
  })
  break_end?: string;

  @ApiPropertyOptional({
    description: "Work days (1=Monday, 7=Sunday)",
    default: [1, 2, 3, 4, 5],
  })
  @IsArray()
  @IsOptional()
  work_days?: number[];

  @ApiPropertyOptional({ description: "Is holiday off", default: true })
  @IsBoolean()
  @IsOptional()
  is_holiday_off?: boolean;

  @ApiPropertyOptional({ description: "Notes" })
  @IsString()
  @IsOptional()
  notes?: string;
}
