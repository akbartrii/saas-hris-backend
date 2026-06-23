import { IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SyncHolidayDto {
  @ApiProperty({ description: "Year to sync", example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;
}
