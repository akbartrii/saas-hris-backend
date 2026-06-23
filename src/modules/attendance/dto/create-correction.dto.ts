import {
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  MaxLength,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCorrectionDto {
  @ApiProperty({ description: "Attendance ID to correct" })
  @IsUUID()
  attendance_id: string;

  @ApiProperty({
    description: "Correction type",
    enum: ["clock_in", "clock_out", "both"],
  })
  @IsIn(["clock_in", "clock_out", "both"])
  correction_type: string;

  @ApiPropertyOptional({ description: "Corrected clock in time (HH:mm)" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "correct_clock_in must be in HH:mm format",
  })
  correct_clock_in?: string;

  @ApiPropertyOptional({ description: "Corrected clock out time (HH:mm)" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "correct_clock_out must be in HH:mm format",
  })
  correct_clock_out?: string;

  @ApiProperty({ description: "Reason for correction" })
  @IsString()
  @MaxLength(1000)
  reason: string;
}
