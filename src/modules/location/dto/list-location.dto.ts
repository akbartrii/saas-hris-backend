import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean } from "class-validator";

export class ListLocationDto {
  @ApiPropertyOptional({ description: "Filter by company UUID" })
  @IsString()
  @IsOptional()
  company_id?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}
