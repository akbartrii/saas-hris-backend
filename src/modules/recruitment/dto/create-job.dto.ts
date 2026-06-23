import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from "class-validator";

export class CreateJobDto {
  @ApiProperty({ description: "Job title" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: "Department UUID" })
  @IsUUID()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: "Position UUID" })
  @IsUUID()
  @IsOptional()
  position_id?: string;

  @ApiPropertyOptional({ description: "Location UUID" })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiProperty({ description: "Job description" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: "Requirements" })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({
    description: "Employment type",
    enum: ["full_time", "part_time", "contract", "internship"],
  })
  @IsString()
  @IsIn(["full_time", "part_time", "contract", "internship"])
  @IsOptional()
  employment_type?: string;

  @ApiPropertyOptional({ description: "Public slug (auto-generated if empty)" })
  @IsString()
  @IsOptional()
  public_slug?: string;

  @ApiPropertyOptional({ description: "Open date (YYYY-MM-DD)" })
  @IsString()
  @IsOptional()
  opened_at?: string;

  @ApiPropertyOptional({ description: "Close date (YYYY-MM-DD)" })
  @IsString()
  @IsOptional()
  closed_at?: string;
}
