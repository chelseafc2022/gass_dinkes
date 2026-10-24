import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import { AccessGuard } from "../auth/security";
import { ApiErrors } from "../common/errors";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiProvider } from "./ai.provider";
import { AiBudget } from "./ai.budget";

describe("AI HTTP authentication and read-only boundary", () => {
  let app: INestApplication;
  let user: any;
  let reports: any;
  const body = {
    action: "summary",
    metric: "kinerja",
    period: { tahun: 2026, bulan: 3, triwulan: null },
    comparison: null,
    entity: null,
    facility: null,
    limit: 5,
  };
  beforeAll(async () => {
    reports = { list: jest.fn().mockResolvedValue({ data: [] }) };
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
      controllers: [AiController],
      providers: [
        AiService,
        { provide: AiProvider, useValue: { configured: () => false } },
        { provide: AiBudget, useValue: { consume: jest.fn() } },
        { provide: ReportsService, useValue: reports },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: async (token: string) => {
              if (token !== "test-session") throw new Error();
              return { sub: "u", sid: "s", type: "access" };
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {
            session: {
              findUnique: async () => ({
                userId: "u",
                user,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 60000),
              }),
            },
            user: { findUnique: async () => user },
            menuPermission: { findUnique: async () => null },
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AccessGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalFilters(new ApiErrors());
    await app.init();
  });
  beforeEach(() => {
    user = { id: "u", role: "KEPALA_DINAS", isActive: true };
    reports.list.mockClear();
  });
  afterAll(async () => {
    await app?.close();
  });
  const post = (path: string) =>
    request(app.getHttpServer())
      .post(`/api/ai/${path}`)
      .set("Authorization", "Bearer test-session")
      .set("X-Gass-Client", "web");
  test("unauthenticated status is 401", async () => {
    await request(app.getHttpServer()).get("/api/ai/status").expect(401);
  });
  test("source requires CSRF compatibility header", async () => {
    await request(app.getHttpServer())
      .post("/api/ai/facts")
      .set("Authorization", "Bearer test-session")
      .send(body)
      .expect(403);
  });
  test("hostile origin rejected", async () => {
    await post("facts")
      .set("Origin", "https://invalid.example")
      .send(body)
      .expect(403);
  });
  test("valid source returns fresh facts with no-store", async () => {
    await post("facts")
      .send(body)
      .expect("Cache-Control", "no-store")
      .expect(200);
  });
  test("role cannot be forged in body", async () => {
    user.role = "OPERATOR_PUSKESMAS";
    await post("facts")
      .send({ ...body, role: "KEPALA_DINAS" })
      .expect(403);
    expect(reports.list).not.toHaveBeenCalled();
  });
  test("disabled account cannot access source", async () => {
    user.isActive = false;
    await post("facts").send(body).expect(401);
  });
  test("invalid read plan is 400", async () => {
    await post("facts")
      .send({ ...body, action: "delete" })
      .expect(400);
  });
  test("disabled provider is explicit", async () => {
    const r = await post("chat")
      .send({ message: "Kinerja?", context: body })
      .expect(200);
    expect(r.body.enabled).toBe(false);
  });
  test("no mutation route exists", async () => {
    await request(app.getHttpServer())
      .delete("/api/ai/facts")
      .set("Authorization", "Bearer test-session")
      .set("X-Gass-Client", "web")
      .expect(404);
  });
});
