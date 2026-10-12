import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
// No messages are enqueued automatically. Enable SMTP and call enqueue from an authorized workflow.
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;
  private worker?: Worker;
  private redis?: IORedis;
  async onModuleInit() {
    if (!process.env.REDIS_URL) return;
    this.redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue("gass-email", {
      connection: this.redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
    this.worker = new Worker(
      "gass-email",
      async (job) => {
        if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
          throw new Error("SMTP belum dikonfigurasi");
        const transport = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          ...(process.env.SMTP_USER
            ? {
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASSWORD,
                },
              }
            : {}),
        });
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: job.data.to,
          subject: job.data.subject,
          text: job.data.text,
        });
      },
      { connection: this.redis as any, concurrency: 2 },
    );
    this.worker.on("failed", (job) =>
      Logger.warn(`Email job ${job?.id} failed`, "Notifications"),
    );
  }
  async enqueue(to: string, subject: string, text: string) {
    if (!this.queue) throw new Error("Redis belum dikonfigurasi");
    return this.queue.add("email", { to, subject, text });
  }
  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }
}
