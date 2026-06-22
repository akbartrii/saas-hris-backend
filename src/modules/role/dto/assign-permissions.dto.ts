import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({ example: ['uuid1', 'uuid2', 'uuid3'] })
  @IsArray()
  @IsUUID('4', { each: true })
  permission_ids: string[];
}
