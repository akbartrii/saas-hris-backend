import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateParameterDto {
  @ApiProperty({ description: "Parameter key" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: "Parameter value" })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class UpdateParameterDto {
  @ApiProperty({ description: "Parameter value" })
  @IsString()
  @IsNotEmpty()
  value: string;
}
