import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class AttendanceReportDto {
  @ApiPropertyOptional({
    description: "Filter by month (YYYY-MM)",
    example: "2025-06",
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ description: "Filter by department UUID" })
  @IsString()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: "Filter by employee UUID" })
  @IsString()
  @IsOptional()
  employee_id?: string;
}

export class LeaveReportDto {
  @ApiPropertyOptional({ description: "Filter by year", example: "2025" })
  @IsString()
  @IsOptional()
  year?: string;

  @ApiPropertyOptional({ description: "Filter by department UUID" })
  @IsString()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: "Filter by leave status" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class PayrollReportDto {
  @ApiPropertyOptional({ description: "Filter by payroll period UUID" })
  @IsString()
  @IsOptional()
  payroll_period_id?: string;

  @ApiPropertyOptional({ description: "Filter by department UUID" })
  @IsString()
  @IsOptional()
  department_id?: string;
}

export class OvertimeReportDto {
  @ApiPropertyOptional({
    description: "Filter by month (YYYY-MM)",
    example: "2025-06",
  })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ description: "Filter by department UUID" })
  @IsString()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: "Filter by employee UUID" })
  @IsString()
  @IsOptional()
  employee_id?: string;
}
