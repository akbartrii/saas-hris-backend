import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
  IsIn,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Full name' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Birth date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  birth_date?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsUUID()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: 'Position ID' })
  @IsUUID()
  @IsOptional()
  position_id?: string;

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Supervisor ID' })
  @IsUUID()
  @IsOptional()
  supervisor_id?: string;

  @ApiPropertyOptional({ description: 'Manager ID' })
  @IsUUID()
  @IsOptional()
  manager_id?: string;

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsUUID()
  @IsOptional()
  team_id?: string;

  @ApiPropertyOptional({
    description: 'Employment status',
    enum: ['permanent', 'contract', 'probation', 'internship'],
  })
  @IsString()
  @IsOptional()
  employment_status?: string;

  @ApiPropertyOptional({ description: 'Join date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  join_date?: string;

  @ApiPropertyOptional({ description: 'Contract end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  contract_end_date?: string;

  @ApiPropertyOptional({ description: 'Base salary' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  base_salary?: number;

  @ApiPropertyOptional({ description: 'Fixed allowance' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  fixed_allowance?: number;

  @ApiPropertyOptional({ description: 'Phone allowance' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  phone_allowance?: number;

  @ApiPropertyOptional({ description: 'Dinas allowance' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  dinas_allowance?: number;

  @ApiPropertyOptional({
    description: 'Shift type',
    enum: ['normal', 'shift_1', 'shift_2', 'shift_3'],
  })
  @IsString()
  @IsOptional()
  shift_type?: string;

  @ApiPropertyOptional({ description: 'Is security' })
  @IsBoolean()
  @IsOptional()
  is_security?: boolean;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nik?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  resignation_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bpjs_payment_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ptkp_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  npwp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bank_account_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_account_holder?: string;
}
