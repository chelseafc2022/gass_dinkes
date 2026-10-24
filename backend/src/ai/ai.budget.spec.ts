import { AiBudget, QUOTA_SCRIPT } from "./ai.budget";
import Redis from "ioredis";

describe("AI quota fails closed", () => {
  let budget: AiBudget;
  const env = { ...process.env };
  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.AI_DAILY_REQUEST_LIMIT = "200";
    budget = new AiBudget();
  });
  afterEach(() => {
    budget.onModuleDestroy();
    process.env = { ...env };
  });
  test("quota rejection is 429", async () => {
    Object.assign(budget, {
      redis: { eval: async () => 0, disconnect: () => {} },
    });
    await expect(budget.consume("leader")).rejects.toMatchObject({
      status: 429,
    });
  });
  test("Redis failure never permits an unmetered provider call", async () => {
    Object.assign(budget, {
      redis: {
        eval: async () => {
          throw new Error("private address");
        },
        disconnect: () => {},
      },
    });
    await expect(budget.consume("leader")).rejects.toMatchObject({
      status: 503,
    });
  });
  test.each(["0", "-1", "NaN", "20000"])(
    "invalid daily cap %s rejected",
    async (cap) => {
      process.env.AI_DAILY_REQUEST_LIMIT = cap;
      await expect(budget.consume("leader")).rejects.toMatchObject({
        status: 503,
      });
    },
  );
});

const integration = process.env.AI_TEST_REDIS_SOCKET ? describe : describe.skip;
integration("AI atomic quota with isolated Redis socket", () => {
  let redis: Redis;
  beforeAll(() => {
    redis = new Redis({
      path: process.env.AI_TEST_REDIS_SOCKET!,
      maxRetriesPerRequest: 0,
    });
  });
  afterAll(async () => {
    await redis.quit();
  });
  test("concurrent requests cannot exceed per-account or global caps", async () => {
    const prefix = `ai-test:${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        redis.eval(QUOTA_SCRIPT, 2, `${prefix}:user`, `${prefix}:day`, 200),
      ),
    );
    expect(results.filter((r) => r === 1)).toHaveLength(10);
    expect(Number(await redis.get(`${prefix}:day`))).toBe(10);
    expect(await redis.ttl(`${prefix}:user`)).toBeGreaterThan(0);
    const global = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        redis.eval(
          QUOTA_SCRIPT,
          2,
          `${prefix}:user:${i}`,
          `${prefix}:global`,
          5,
        ),
      ),
    );
    expect(global.filter((r) => r === 1)).toHaveLength(5);
  });
});
