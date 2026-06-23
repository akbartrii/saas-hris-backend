import { PartialType } from "@nestjs/swagger";
import { CreateRemoteWorkDto } from "./create-remote-work.dto";

export class UpdateRemoteWorkDto extends PartialType(CreateRemoteWorkDto) {}
