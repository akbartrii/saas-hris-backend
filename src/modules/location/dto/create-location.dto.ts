import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
} from "class-validator";

export class CreateLocationDto {
  @ApiProperty({ description: "Company UUID" })
  @IsUUID()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({ description: "Location name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Location type (office, warehouse, etc)" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: "Latitude" })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude" })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: "Radius in meters", default: 100 })
  @IsNumber()
  @IsOptional()
  radius_meters?: number;

  @ApiPropertyOptional({ description: "Address" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Is active", default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
