import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RevokeFcmTokenDto {
  @ApiProperty({ example: "bk3RNwTe3H0:CI2k_HHH..." })
  @IsString()
  @IsNotEmpty()
  fcm_token: string;

  @ApiProperty()
  @IsString()
  token: string;
}
