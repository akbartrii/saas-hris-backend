import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class CreateTimeOffTypeDto {
  @ApiProperty({ description: "Time off type name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Unique code" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: "Affects salary", default: false })
  @IsBoolean()
  @IsOptional()
  affects_salary?: boolean;

  @ApiPropertyOptional({ description: "Requires attachment", default: false })
  @IsBoolean()
  @IsOptional()
  requires_attachment?: boolean;
}
