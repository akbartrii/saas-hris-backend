import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ClockOutDto {
  @ApiProperty({ description: "Latitude", example: -6.8707172 })
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: "Longitude", example: 109.1288873 })
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
