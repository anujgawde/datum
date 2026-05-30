import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ZodError } from "zod";
import { SpecService, type SpecUploadResponse } from "./spec.service.js";

@Controller()
export class SpecController {
  constructor(@Inject(SpecService) private readonly specService: SpecService) {}

  @Post("spec")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown
  ): Promise<SpecUploadResponse> {
    try {
      return await this.specService.upload(file, body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException(err.issues);
      }
      throw new BadRequestException((err as Error).message);
    }
  }
}
