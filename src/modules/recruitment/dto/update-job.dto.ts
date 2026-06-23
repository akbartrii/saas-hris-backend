import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsIn, IsDateString } from "class-validator";

export class UpdateJobDto {
  @ApiPropertyOptional({ description: "Job title" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: "Job description" })
  @IsString()
  @IsOptional()
  description?: string;

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

  @ApiPropertyOptional({
    description: "Job status",
    enum: ["draft", "active", "closed"],
  })
  @IsString()
  @IsIn(["draft", "active", "closed"])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Close date (YYYY-MM-DD)" })
  @IsDateString()
  @IsOptional()
  closed_at?: string;
}
