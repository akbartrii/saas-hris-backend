import { IsOptional, IsString, IsBooleanString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UserQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  is_active?: string;

  @ApiPropertyOptional({ default: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ default: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
