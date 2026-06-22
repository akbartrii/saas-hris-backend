import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListRemoteWorkDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status (pending, approved, rejected, cancelled)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by employee_id (admin only)' })
  @IsString()
  @IsOptional()
  employee_id?: string;
}
