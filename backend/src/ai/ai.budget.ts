import {
  HttpException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";
import Redis from "ioredis";

// One atomic quota across backend replicas. Fail closed when Redis is unavailable.
export const QUOTA_SCRIPT = `
local minute = tonumber(redis.call('GET', KEYS[1]) or '0')
local daily = tonumber(redis.call('GET', KEYS[2]) or '0')
if minute >= 10 or daily >= tonumber(ARGV[1]) then return 0 end
redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 60)
redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 172800)
return 1`;

@Injectable()
export class AiBudget implements OnModuleDestroy {
  private redis?: Redis;
  async consume(userId: string) {
    const cap = Number(process.env.AI_DAILY_REQUEST_LIMIT || 200);
    if (
      !process.env.REDIS_URL ||
      !Number.isInteger(cap) ||
      cap < 1 ||
      cap > 10000
    )
      throw new ServiceUnavailableException(
        "Batas penggunaan AI belum dikonfigurasi.",
      );
    if (!this.redis) {
      this.redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        connectTimeout: 1500,
        commandTimeout: 2000,
        retryStrategy: () => null,
      });
      this.redis.on("error", () => {});
    }
    const now = Date.now();
    const day = Math.floor((now + 8 * 3600000) / 86400000);
    let allowed: unknown;
    try {
      allowed = await this.redis.eval(
        QUOTA_SCRIPT,
        2,
        `gass:{ai}:minute:${userId}:${Math.floor(now / 60000)}`,
        `gass:{ai}:day:${day}`,
        cap,
      );
    } catch {
      this.redis.disconnect();
      this.redis = undefined;
      throw new ServiceUnavailableException(
        "Layanan pembatas penggunaan AI tidak tersedia.",
      );
    }
    if (allowed !== 1)
      throw new HttpException(
        "Batas penggunaan AI tercapai. Coba kembali nanti.",
        429,
      );
  }
  onModuleDestroy() {
    this.redis?.disconnect();
  }
}
