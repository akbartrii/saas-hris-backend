import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, IsNotEmpty, Matches } from "class-validator";

export class CreateOvertimeDto {
  @ApiProperty({ description: "Target employee UUID" })
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @ApiProperty({
    description: "Overtime date (YYYY-MM-DD)",
    example: "2025-06-15",
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: "Start time (HH:mm)", example: "18:00" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  start_time: string;

  @ApiProperty({ description: "End time (HH:mm)", example: "22:00" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  end_time: string;

  @ApiProperty({
    description: "Overtime type: weekday, weekend, or holiday",
    example: "weekday",
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: "Description / reason for overtime" })
  @IsString()
  @IsNotEmpty()
  description: string;
}
