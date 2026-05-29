import { BadRequestException, Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { ZodError } from "zod";
import { CheckService, type CheckResponse } from "./check.service.js";

@Controller()
export class CheckController {
  constructor(@Inject(CheckService) private readonly checkService: CheckService) {}

  @Get("health")
  health(): { status: string } {
    return { status: "ok" };
  }

  @Post("check")
  async check(@Body() body: unknown): Promise<CheckResponse> {
    try {
      return await this.checkService.check(body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues);
      }
      throw err;
    }
  }
}
