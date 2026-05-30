import { Module } from "@nestjs/common";
import { CheckModule } from "./check/check.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { SpecModule } from "./spec/spec.module.js";

@Module({
  imports: [CheckModule, ProjectsModule, SpecModule],
})
export class AppModule {}
