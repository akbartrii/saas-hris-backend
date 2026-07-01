import { IsUUID, IsDateString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AssignScheduleDto {
  @ApiProperty({ description: "Work schedule template ID" })
  @IsUUID()
  schedule_id: string;

  @ApiProperty({ description: "Effective date of the schedule" })
  @IsDateString()
  effective_date: string;

  @ApiPropertyOptional({ description: "End date of the schedule (null = ongoing)" })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

export class UpdateEmployeeScheduleDto {
  @ApiPropertyOptional({ description: "Work schedule template ID" })
  @IsOptional()
  @IsUUID()
  schedule_id?: string;

  @ApiPropertyOptional({ description: "Effective date of the schedule" })
  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @ApiPropertyOptional({ description: "End date of the schedule (null = ongoing)" })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
