import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class RegisterFaceDto {
  @ApiProperty({
    description: "Front facing photo",
    type: "string",
    format: "binary",
  })
  @IsString()
  @IsNotEmpty()
  front_photo: string;

  @ApiProperty({ description: "Smile photo", type: "string", format: "binary" })
  @IsString()
  @IsNotEmpty()
  smile_photo: string;

  @ApiProperty({
    description: "Right facing photo",
    type: "string",
    format: "binary",
  })
  @IsString()
  @IsNotEmpty()
  right_photo: string;

  @ApiProperty({
    description: "Left facing photo",
    type: "string",
    format: "binary",
  })
  @IsString()
  @IsNotEmpty()
  left_photo: string;
}
