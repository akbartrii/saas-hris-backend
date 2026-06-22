import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePayslipDto {
  @ApiProperty({ description: 'Payroll period UUID' })
  @IsUUID()
  @IsNotEmpty()
  payroll_period_id: string;

  @ApiProperty({ description: 'Employee UUID' })
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;
}

export class GenerateBatchPayslipDto {
  @ApiProperty({ description: 'Payroll period UUID' })
  @IsUUID()
  @IsNotEmpty()
  payroll_period_id: string;
}

export class GenerateTHRDto {
  @ApiProperty({ description: 'Employee UUID' })
  @IsUUID()
  @IsNotEmpty()
  employee_id: string;

  @ApiProperty({ description: 'Period name (e.g. THR 2025)' })
  @IsString()
  @IsNotEmpty()
  period_name: string;

  @ApiProperty({ description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(2020)
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thr_amount?: string;
}

export class ExportPayrollDto {
  @ApiProperty({ description: 'Payroll period UUID' })
  @IsUUID()
  @IsNotEmpty()
  payroll_period_id: string;
}

export class ListPayslipDto {
  @ApiPropertyOptional({ description: 'Filter by payroll period UUID' })
  @IsUUID()
  @IsOptional()
  payroll_period_id?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class PublishPayslipDto {
  @ApiProperty({ description: 'Payslip UUID' })
  @IsUUID()
  @IsNotEmpty()
  payslip_id: string;
}

export class CreatePayrollPeriodDto {
  @ApiProperty({ description: 'Company UUID' })
  @IsUUID()
  @IsNotEmpty()
  company_id: string;

  @ApiProperty({ description: 'Month (1-12)' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(2020)
  year: number;

  @ApiProperty({ description: 'Period name' })
  @IsString()
  @IsNotEmpty()
  period_name: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Attendance cutoff start date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  attendance_cutoff_start?: string;

  @ApiPropertyOptional({
    description: 'Attendance cutoff end date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  attendance_cutoff_end?: string;

  @ApiPropertyOptional({ description: 'Payment date (ISO string)' })
  @IsDateString()
  @IsOptional()
  payment_date?: string;
}

export class UpdatePayrollPeriodDto {
  @ApiPropertyOptional({ description: 'Company UUID' })
  @IsUUID()
  @IsOptional()
  company_id?: string;

  @ApiPropertyOptional({ description: 'Month (1-12)' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Year' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({ description: 'Period name' })
  @IsString()
  @IsOptional()
  period_name?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsString()
  @IsOptional()
  @IsIn(['draft', 'processing', 'published', 'closed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Attendance cutoff start date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  attendance_cutoff_start?: string;

  @ApiPropertyOptional({
    description: 'Attendance cutoff end date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  attendance_cutoff_end?: string;

  @ApiPropertyOptional({ description: 'Payment date (ISO string)' })
  @IsDateString()
  @IsOptional()
  payment_date?: string;
}
