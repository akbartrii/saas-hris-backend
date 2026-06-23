import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListNotificationDto {
  @ApiPropertyOptional({ description: "Filter by read status", default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_read?: boolean;

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
