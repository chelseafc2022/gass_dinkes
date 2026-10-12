import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { ZodError } from "zod";
@Catch()
export class ApiErrors implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    let status = 500;
    let message: any = "Terjadi kesalahan pada server.";
    if (error instanceof HttpException) {
      status = error.getStatus();
      const r = error.getResponse();
      message = typeof r === "string" ? r : (r as any).message;
    } else if (error instanceof ZodError) {
      status = 400;
      message = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } else if (error?.code === "P2002") {
      status = 409;
      message = "Data dengan identitas tersebut sudah terdaftar.";
    } else if (error?.code === "P2003") {
      status = 409;
      message = "Relasi tidak valid atau data masih digunakan.";
    } else if (error?.code === "P2034") {
      status = 409;
      message = "Data berubah saat disimpan. Muat ulang dan coba kembali.";
    } else if (error?.code === "P2025") {
      status = 404;
      message = "Data tidak ditemukan.";
    } else Logger.error(error?.message, "API");
    host
      .switchToHttp()
      .getResponse()
      .status(status)
      .json({ statusCode: status, message });
  }
}
