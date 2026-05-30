import { Module } from "@nestjs/common";
import { CheckModule } from "./check/check.module.js";

@Module({
  imports: [CheckModule],
})
export class AppModule {}
