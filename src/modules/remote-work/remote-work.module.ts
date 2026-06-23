import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { RemoteWorkController } from "./remote-work.controller";
import { RemoteWorkService } from "./remote-work.service";

@Module({
  imports: [PrismaModule],
  controllers: [RemoteWorkController],
  providers: [RemoteWorkService],
})
export class RemoteWorkModule {}
