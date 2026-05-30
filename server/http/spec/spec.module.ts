import { Module } from "@nestjs/common";
import { SpecController } from "./spec.controller.js";
import { SpecService } from "./spec.service.js";

@Module({
  controllers: [SpecController],
  providers: [SpecService],
})
export class SpecModule {}
