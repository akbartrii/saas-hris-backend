import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ToggleWebClockInDto {
  @ApiProperty({ description: "Allow web clock-in", example: true })
  @IsBoolean()
  allow: boolean;
}
