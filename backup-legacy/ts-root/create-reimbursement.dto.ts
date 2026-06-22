import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class CreateReimbursementDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Category', example: 'transport' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Proof image URL' })
  @IsString()
  @IsOptional()
  proof_image_url?: string;
}
