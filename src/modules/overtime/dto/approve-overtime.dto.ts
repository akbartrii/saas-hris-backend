import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsIn, IsOptional } from "class-validator";

export class ApproveOvertimeDto {
  @ApiProperty({ description: "Action to take", enum: ["approve", "reject"] })
  @IsString()
  @IsIn(["approve", "reject"])
  @IsNotEmpty()
  action: "approve" | "reject";

  @ApiPropertyOptional({ description: "Reason for rejection" })
  @IsString()
  @IsOptional()
  rejection_reason?: string;
}
