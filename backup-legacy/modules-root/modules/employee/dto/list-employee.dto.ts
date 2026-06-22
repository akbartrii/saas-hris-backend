import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListEmployeeDto {
  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsString()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Filter by position UUID' })
  @IsString()
  @IsOptional()
  position_id?: string;

  @ApiPropertyOptional({ description: 'Filter by team UUID' })
  @IsString()
  @IsOptional()
  team_id?: string;

  @ApiPropertyOptional({ description: 'Search by name or NIK' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
