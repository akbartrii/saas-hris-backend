import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: ['new', 'review', 'interview', 'lolos', 'ditolak'],
  })
  @IsString()
  @IsIn(['new', 'review', 'interview', 'lolos', 'ditolak'])
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
