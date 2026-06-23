import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
} from "class-validator";

export class CreateLeaveTypeDto {
  @ApiProperty({ description: "Leave type name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Unique code" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: "Default days allocated", default: 0 })
  @IsInt()
  @IsOptional()
  default_days?: number;

  @ApiPropertyOptional({ description: "Is annual leave", default: false })
  @IsBoolean()
  @IsOptional()
  is_annual?: boolean;

  @ApiPropertyOptional({ description: "Is paid leave", default: true })
  @IsBoolean()
  @IsOptional()
  is_paid?: boolean;

  @ApiPropertyOptional({ description: "Requires attachment", default: false })
  @IsBoolean()
  @IsOptional()
  requires_attachment?: boolean;

  @ApiPropertyOptional({ description: "Max days per request" })
  @IsInt()
  @IsOptional()
  max_days_per_request?: number;

  @ApiPropertyOptional({
    description: "Leave category",
    enum: [
      "annual",
      "government_mandatory",
      "umroh",
      "sick",
      "personal",
      "other",
    ],
    default: "other",
  })
  @IsString()
  @IsOptional()
  category?: string;
}
