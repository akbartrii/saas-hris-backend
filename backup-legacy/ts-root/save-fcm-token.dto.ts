import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveFcmTokenDto {
  @ApiProperty({ example: 'bk3RNwTe3H0:CI2k_HHH...' })
  @IsString()
  @IsNotEmpty()
  fcm_token: string;

  @ApiProperty({ example: '87f23c9a12345678' })
  @IsString()
  @IsOptional()
  device_id?: string;

  @ApiProperty({ example: 'android' })
  @IsString()
  @IsOptional()
  platform?: string;
}
