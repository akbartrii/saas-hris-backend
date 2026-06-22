import { PartialType } from '@nestjs/swagger';
import { CreateOvertimeMealAllowanceDto } from './create-overtime-meal-allowance.dto';

export class UpdateOvertimeMealAllowanceDto extends PartialType(
  CreateOvertimeMealAllowanceDto,
) {}
