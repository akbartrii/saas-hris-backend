import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsIn,
  IsUUID,
  IsBoolean,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateEmployeeDto {
  @ApiProperty({ description: "Full name" })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiPropertyOptional({ description: "NIK" })
  @IsOptional()
  @IsString()
  nik?: string;

  @ApiPropertyOptional({ description: "Email address" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Password" })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: "Gender", enum: ["male", "female"] })
  @IsOptional()
  @IsIn(["male", "female"])
  gender?: string;

  @ApiPropertyOptional({ description: "Birth date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiPropertyOptional({ description: "Department ID" })
  @IsOptional()
  @IsUUID()
  department_id?: string;

  @ApiPropertyOptional({ description: "Position ID" })
  @IsOptional()
  @IsUUID()
  position_id?: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({ description: "Supervisor ID" })
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @ApiPropertyOptional({ description: "Manager ID" })
  @IsOptional()
  @IsUUID()
  manager_id?: string;

  @ApiPropertyOptional({ description: "Team ID" })
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @ApiPropertyOptional({
    description: "Employment status",
    enum: ["permanent", "contract", "probation", "internship"],
  })
  @IsOptional()
  @IsIn(["permanent", "contract", "probation", "internship"])
  employment_status?: string;

  @ApiPropertyOptional({ description: "Join date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  join_date?: string;

  @ApiPropertyOptional({ description: "Contract end date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  contract_end_date?: string;

  @ApiPropertyOptional({ description: "Base salary" })
  @IsOptional()
  @IsString()
  base_salary?: string;

  @ApiPropertyOptional({ description: "Fixed allowance" })
  @IsOptional()
  @IsString()
  fixed_allowance?: string;

  @ApiPropertyOptional({ description: "Phone allowance" })
  @IsOptional()
  @IsString()
  phone_allowance?: string;

  @ApiPropertyOptional({ description: "Dinas allowance" })
  @IsOptional()
  @IsString()
  dinas_allowance?: string;

  @ApiPropertyOptional({
    description: "Shift type",
    enum: ["normal", "shift_1", "shift_2", "shift_3"],
  })
  @IsOptional()
  @IsIn(["normal", "shift_1", "shift_2", "shift_3"])
  shift_type?: string;

  @ApiPropertyOptional({ description: "Is security" })
  @IsOptional()
  @IsBoolean()
  is_security?: boolean;

  @ApiPropertyOptional({ description: "Phone number" })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: "Address" })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: "Role ID" })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiPropertyOptional({ description: "Company ID" })
  @IsOptional()
  @IsUUID()
  company_id?: string;

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
