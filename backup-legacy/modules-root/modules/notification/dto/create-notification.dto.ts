import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Notification type', example: 'leave_approved' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Reference type (e.g., leave_request)' })
  @IsString()
  @IsOptional()
  reference_type?: string;

  @ApiPropertyOptional({ description: 'Reference UUID' })
  @IsUUID()
  @IsOptional()
  reference_id?: string;
}
