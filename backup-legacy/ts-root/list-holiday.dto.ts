import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListHolidayDto {
  @ApiPropertyOptional({ description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;
}
