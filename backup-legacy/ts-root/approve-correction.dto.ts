import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCorrectionDto {
  @ApiProperty({ description: 'Action', enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: string;

  @ApiPropertyOptional({ description: 'Rejection reason (if rejecting)' })
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}
