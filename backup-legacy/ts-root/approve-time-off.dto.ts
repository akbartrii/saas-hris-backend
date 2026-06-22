import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveTimeOffDto {
  @ApiProperty({ description: 'Action', enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: string;

  @ApiPropertyOptional({ description: 'Rejection reason (if rejecting)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejection_reason?: string;
}
