import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ListAttendanceDto {
  @ApiPropertyOptional({ description: "Filter by date (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: "Filter by month (YYYY-MM)" })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: "Filter by status" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
