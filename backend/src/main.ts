import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiErrors } from "./common/errors";
async function bootstrap() {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST?.trim() || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT harus berupa angka antara 1 dan 65535.");
  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET.length < 32
  )
    throw new Error("JWT_ACCESS_SECRET harus diisi minimal 32 karakter.");
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalFilters(new ApiErrors());
  app.enableCors({
    origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(","),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Gass-Client"],
  });
  app.enableShutdownHooks();
  if (process.env.NODE_ENV !== "production")
    SwaggerModule.setup(
      "docs",
      app,
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle("GASS API")
          .setDescription("Gerakan Aksi Sehat Setara — Dinas Kesehatan")
          .setVersion("1.0")
          .addCookieAuth("gass_access")
          .build(),
      ),
    );
  await app.listen(port, host);
}
void bootstrap();
