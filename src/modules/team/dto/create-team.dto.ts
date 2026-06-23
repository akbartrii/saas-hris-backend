import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
} from "class-validator";

export class CreateTeamDto {
  @ApiProperty({ description: "Department UUID" })
  @IsUUID()
  @IsNotEmpty()
  department_id: string;

  @ApiProperty({ description: "Team name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Team code" })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: "Is active", default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
