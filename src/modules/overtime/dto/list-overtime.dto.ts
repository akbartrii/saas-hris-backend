import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ListOvertimeDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by status" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: "Filter by month (YYYY-MM)",
    example: "2025-06",
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ description: "Filter by employee UUID" })
  @IsString()
  @IsOptional()
  employee_id?: string;
}
