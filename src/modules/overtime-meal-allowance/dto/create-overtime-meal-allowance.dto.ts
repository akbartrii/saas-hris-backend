import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Matches } from "class-validator";

export class CreateOvertimeMealAllowanceDto {
  @ApiProperty({ description: "Day type (weekday, weekend, holiday)" })
  @IsString()
  @IsNotEmpty()
  day_type: string;

  @ApiProperty({ description: "Start time (HH:mm:ss)" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "time_start must be in HH:mm or HH:mm:ss format",
  })
  time_start: string;

  @ApiProperty({ description: "End time (HH:mm:ss)" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: "time_end must be in HH:mm or HH:mm:ss format",
  })
  time_end: string;

  @ApiProperty({ description: "Allowance amount" })
  @IsString()
  @IsNotEmpty()
  amount: string;
}
