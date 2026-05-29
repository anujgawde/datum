import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Datum: server listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error("Datum: server failed to start.", err);
  process.exitCode = 1;
});
