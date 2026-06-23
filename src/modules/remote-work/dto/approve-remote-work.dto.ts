import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class ApproveRemoteWorkDto {
  @ApiProperty({ description: "Action: approve or reject" })
  @IsString()
  @IsNotEmpty()
  action: "approve" | "reject";

  @ApiProperty({ description: "Rejection reason (if rejected)" })
  @IsString()
  @IsNotEmpty()
  rejection_reason?: string;
}
