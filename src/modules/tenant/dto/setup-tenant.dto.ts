import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class DefaultDepartmentDto {
  @ApiProperty({ example: "Human Resources" })
  @IsString()
  name: string;
}

class DefaultLeaveTypeDto {
  @ApiProperty({ example: "Annual Leave" })
  @IsString()
  name: string;

  @ApiProperty({ example: 12 })
  @IsString()
  default_days: string;
}

export class SetupTenantDto {
  @ApiPropertyOptional({ example: "https://company-logo.url" })
  @IsString()
  @IsOptional()
  logo_url?: string;

  @ApiPropertyOptional({ example: "+6281234567890" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Jl. Sudirman No. 123, Jakarta" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ type: [DefaultDepartmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultDepartmentDto)
  departments: DefaultDepartmentDto[];

  @ApiProperty({ type: [DefaultLeaveTypeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefaultLeaveTypeDto)
  leave_types: DefaultLeaveTypeDto[];
}
