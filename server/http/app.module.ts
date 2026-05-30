import { Module } from "@nestjs/common";
import { CheckModule } from "./check/check.module.js";
import { SpecModule } from "./spec/spec.module.js";

@Module({
  imports: [CheckModule, SpecModule],
})
export class AppModule {}
