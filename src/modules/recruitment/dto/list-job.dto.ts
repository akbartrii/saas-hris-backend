import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListJobDto {
  @ApiPropertyOptional({
    description: "Company ID (required for public access)",
  })
  @IsString()
  @IsOptional()
  company_id?: string;

  @ApiPropertyOptional({ description: "Filter by status", default: "active" })
  @IsString()
  @IsOptional()
  status?: string = "active";

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
