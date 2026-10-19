import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ThrottlerGuard } from "@nestjs/throttler";
import request from "supertest";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { EgovService } from "./auth/egov.service";
import { ApiErrors } from "./common/errors";
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration("GASS API with isolated PostgreSQL", () => {
  let app: INestApplication, db: PrismaService, jwt: JwtService;
  const year = new Date().getFullYear() - 1;
  let admin: any,
    operator: any,
    bidangUser: any,
    kadis: any,
    facility: any,
    otherFacility: any,
    bidang: any,
    otherBidang: any,
    program: any,
    restrictedProgram: any,
    sub: any,
    otherSub: any,
    indicator: any,
    otherIndicator: any;
  const tokens: Record<string, string> = {};
  const http = () => request(app.getHttpServer());
  const call = (
    method: "get" | "post" | "put" | "delete",
    path: string,
    role = "admin",
  ) =>
    http()
      [method](`/api${path}`)
      .set("Authorization", `Bearer ${tokens[role]}`)
      .set("X-Gass-Client", "web");
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL!.includes("gass_test"))
      throw new Error("Use an isolated gass_test database");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_ACCESS_SECRET =
      "test-only-secret-with-more-than-thirty-two-characters";
    process.env.REDIS_URL = "";
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EgovService)
      .useValue({
        authenticate: async (identifier: string, password: string) => {
          if (password !== "test-password")
            throw new Error("test identity rejected");
          return {
            nip: identifier,
            egovId: identifier,
            name: "Test identity",
            jabatan: "Tester",
          };
        },
      })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalFilters(new ApiErrors());
    await app.init();
    db = app.get(PrismaService);
    jwt = app.get(JwtService);
    // Dedicated test DB only. Each test run starts from a fresh public schema migrated beforehand.
    await db.periodeOverride.deleteMany({ where: { tahun: year } });
    const id = randomBytes(6).toString("hex");
    bidang = await db.penanggungJawab.create({
      data: { namaBidang: `Bidang A ${id}` },
    });
    otherBidang = await db.penanggungJawab.create({
      data: { namaBidang: `Bidang B ${id}` },
    });
    const kec = await db.kecamatan.create({
      data: { kodeKecamatan: id, namaKecamatan: "Kecamatan Uji" },
    });
    facility = await db.faskes.create({
      data: { namaFaskes: "Faskes Uji A", kecamatanId: kec.id },
    });
    otherFacility = await db.faskes.create({
      data: { namaFaskes: "Faskes Uji B", kecamatanId: kec.id },
    });
    program = await db.program.create({
      data: {
        kodeProgram: id,
        namaProgram: "Program Uji",
        tahun: year,
        isAksesFaskes: true,
        bidangId: bidang.id,
      },
    });
    restrictedProgram = await db.program.create({
      data: {
        kodeProgram: id + "b",
        namaProgram: "Program Terbatas",
        tahun: year,
        isAksesFaskes: false,
        bidangId: otherBidang.id,
      },
    });
    const k = await db.kegiatan.create({
        data: {
          programId: program.id,
          kodeKegiatan: id,
          namaKegiatan: "Kegiatan Uji",
        },
      }),
      k2 = await db.kegiatan.create({
        data: {
          programId: restrictedProgram.id,
          kodeKegiatan: id + "b",
          namaKegiatan: "Kegiatan B",
        },
      });
    sub = await db.subKegiatan.create({
      data: {
        kegiatanId: k.id,
        kodeSubKegiatan: id,
        namaSubKegiatan: "Sub Uji",
      },
    });
    otherSub = await db.subKegiatan.create({
      data: {
        kegiatanId: k2.id,
        kodeSubKegiatan: id + "b",
        namaSubKegiatan: "Sub Uji B",
      },
    });
    const unit = await db.satuan.create({ data: { namaSatuan: "Unit " + id } });
    indicator = await db.indikator.create({
      data: {
        namaIndikator: "SPM Uji",
        kategoriIndikator: "SPM",
        satuanId: unit.id,
        subKegiatanId: sub.id,
        bidang: { create: { bidangId: bidang.id } },
      },
    });
    otherIndicator = await db.indikator.create({
      data: {
        namaIndikator: "SPM Uji B",
        kategoriIndikator: "SPM",
        satuanId: unit.id,
        subKegiatanId: otherSub.id,
        bidang: { create: { bidangId: otherBidang.id } },
      },
    });
    admin = await db.user.create({
      data: { nip: id + "1", name: "Admin Uji", role: "ADMIN_DINKES" },
    });
    operator = await db.user.create({
      data: {
        nip: id + "2",
        name: "Operator Uji",
        role: "OPERATOR_PUSKESMAS",
        faskesId: facility.id,
      },
    });
    bidangUser = await db.user.create({
      data: {
        nip: id + "3",
        name: "Bidang Uji",
        role: "AKUN_BIDANG",
        bidangId: bidang.id,
      },
    });
    kadis = await db.user.create({
      data: { nip: id + "4", name: "Kadis Uji", role: "KEPALA_DINAS" },
    });
    for (const [role, u] of Object.entries({
      admin,
      operator,
      bidang: bidangUser,
      kadis,
    })) {
      const s = await db.session.create({
        data: {
          userId: u.id,
          tokenHash: randomBytes(32).toString("hex"),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      tokens[role] = jwt.sign(
        { sub: u.id, sid: s.id, type: "access" },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          issuer: "gass",
          audience: "gass-web",
          expiresIn: "15m",
        },
      );
    }
    await db.pengaturanSistem.upsert({
      where: { id: "default" },
      create: { isOtomatisAktif: false },
      update: { isOtomatisAktif: false },
    });
  }, 30000);
  afterAll(async () => {
    await app?.close();
  });
  test("requires authentication", async () => {
    await http().get("/api/dashboard").expect(401);
  });
  test("rejects cross-origin mutation", async () => {
    await call("put", "/admin/settings")
      .set("Origin", "https://evil.example")
      .send({})
      .expect(403);
  });
  test("operator cannot list masters", async () => {
    await call("get", "/master/program", "operator").expect(403);
  });
  test("operator cannot request another facility", async () => {
    await call(
      "get",
      `/dashboard?tahun=${year}&faskesId=${otherFacility.id}`,
      "operator",
    ).expect(403);
  });
  test("master validation rejects unrecognized fields", async () => {
    await call("post", "/master/satuan")
      .send({ namaSatuan: "Unit baru", admin: true })
      .expect(400);
  });
  test("admin CRUD persists and audits", async () => {
    const r = await call("post", "/master/satuan")
      .send({
        namaSatuan: "CRUD " + randomBytes(6).toString("hex"),
        simbol: "u",
      })
      .expect(201);
    await call("put", `/master/satuan/${r.body.id}`)
      .send({ namaSatuan: r.body.namaSatuan, simbol: "v" })
      .expect(200);
    await call("delete", `/master/satuan/${r.body.id}`).expect(200);
    expect(await db.auditLog.count({ where: { entityId: r.body.id } })).toBe(3);
  });
  test("backfill permits own target and monthly input", async () => {
    await call("put", "/capaian/kinerja", "operator")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        target: 100,
      })
      .expect(200);
    await call("put", "/capaian/kinerja", "operator")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 1,
        nilai: 40,
      })
      .expect(200);
  });
  test("other facility write rejected", async () => {
    await call("put", "/capaian/kinerja", "operator")
      .send({
        entityId: indicator.id,
        faskesId: otherFacility.id,
        tahun: year,
        bulan: 1,
        nilai: 40,
      })
      .expect(403);
  });
  test("restricted financial program rejected", async () => {
    await call("put", "/capaian/keuangan", "operator")
      .send({
        entityId: otherSub.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 1,
        nilai: 40,
      })
      .expect(403);
  });
  test("bidang cannot edit unrelated indicator", async () => {
    await call("put", "/capaian/kinerja", "bidang")
      .send({
        entityId: otherIndicator.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 1,
        nilai: 40,
      })
      .expect(403);
  });
  test("bidang cannot create activity on another bidang program", async () => {
    await call("post", "/master/kegiatan", "bidang")
      .send({
        programId: restrictedProgram.id,
        kodeKegiatan: "x",
        namaKegiatan: "Not allowed",
      })
      .expect(403);
  });
  test("Kadis can read but cannot write", async () => {
    await call("get", `/capaian/kinerja?tahun=${year}`, "kadis").expect(200);
    await call("put", "/capaian/kinerja", "kadis")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        target: 100,
      })
      .expect(403);
  });
  test("financial amounts retain cents", async () => {
    await call("put", "/capaian/keuangan", "operator")
      .send({
        entityId: sub.id,
        faskesId: facility.id,
        tahun: year,
        target: 1000,
      })
      .expect(200);
    await call("put", "/capaian/keuangan", "operator")
      .send({
        entityId: sub.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 1,
        nilai: 125.25,
      })
      .expect(200);
    const r = await call(
      "get",
      `/capaian/keuangan?tahun=${year}`,
      "operator",
    ).expect(200);
    expect(r.body.data[0].realisasi).toBe(125.25);
  });
  test("verified reports are locked for operators and corrections reopen them", async () => {
    let row = await db.capaianKinerja.findFirstOrThrow({
      where: { indikatorId: indicator.id },
    });
    await call("post", `/capaian/kinerja/${row.id}/verify`, "bidang")
      .send({ validated: true })
      .expect(201);
    await call("put", "/capaian/kinerja", "operator")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 2,
        nilai: 10,
      })
      .expect(403);
    row = await db.capaianKinerja.findUniqueOrThrow({ where: { id: row.id } });
    expect(row.isValidated).toBe(true);
    await call("put", "/capaian/kinerja", "bidang")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 2,
        nilai: 10,
      })
      .expect(200);
    row = await db.capaianKinerja.findUniqueOrThrow({ where: { id: row.id } });
    expect(row.isValidated).toBe(false);
  });
  test("dashboard is scoped, aggregates selected month, ranks missing reports", async () => {
    await call("put", "/capaian/kinerja")
      .send({
        entityId: indicator.id,
        faskesId: otherFacility.id,
        tahun: year,
        target: 100,
        bulan: 1,
        nilai: 20,
      })
      .expect(200);
    const r = await call(
      "get",
      `/dashboard?tahun=${year}&bulan=1`,
      "operator",
    ).expect(200);
    expect(r.body.summary.faskes).toBe(1);
    expect(
      r.body.indicators.find((i: any) => i.id === indicator.id).realisasi,
    ).toBe(40);
    expect(
      r.body.indicators.every((i: any) =>
        i.ranking.every((f: any) => f.faskesId === facility.id),
      ),
    ).toBe(true);
  });
  test("automatic deadline closes historical periods; bidang bypasses", async () => {
    await call("put", "/admin/settings")
      .send({
        batasTanggalInput: 5,
        isOtomatisAktif: true,
        mulaiOtomatisPeriode: null,
      })
      .expect(200);
    const b = {
      entityId: indicator.id,
      faskesId: facility.id,
      tahun: year,
      bulan: 1,
      nilai: 41,
    };
    await call("put", "/capaian/kinerja", "operator").send(b).expect(403);
    await call("put", "/capaian/kinerja", "bidang").send(b).expect(200);
    await call("put", "/capaian/kinerja", "operator")
      .send({ ...b, target: 150, bulan: undefined, nilai: undefined })
      .expect(403);
  });
  test("override reopens a closed month", async () => {
    await call("put", "/admin/overrides")
      .send({
        tahun: year,
        bulan: 1,
        statusOverride: "BUKA",
        batasKhusus: null,
        keterangan: "Pengujian",
      })
      .expect(200);
    await call("put", "/capaian/kinerja", "operator")
      .send({
        entityId: indicator.id,
        faskesId: facility.id,
        tahun: year,
        bulan: 1,
        nilai: 42,
      })
      .expect(200);
  });
  test("matrix allows admin dinkes to grant operator master access", async () => {
    await call("put", "/admin/permissions")
      .send({
        role: "OPERATOR_PUSKESMAS",
        menuKey: "master_program",
        canAccess: true,
      })
      .expect(200);
  });
  test("matrix prevents modifying admin dinkes permissions", async () => {
    await call("put", "/admin/permissions")
      .send({
        role: "ADMIN_DINKES",
        menuKey: "pengguna",
        canAccess: false,
      })
      .expect(403);
  });
  test("permission revocation applies immediately", async () => {
    await call("put", "/admin/permissions")
      .send({
        role: "OPERATOR_PUSKESMAS",
        menuKey: "capaian_keuangan",
        canAccess: false,
      })
      .expect(200);
    await call("get", `/capaian/keuangan?tahun=${year}`, "operator").expect(
      403,
    );
    await call("put", "/admin/permissions")
      .send({
        role: "OPERATOR_PUSKESMAS",
        menuKey: "capaian_keuangan",
        canAccess: true,
      })
      .expect(200);
  });
  test("refresh rotates opaque token and old token is rejected", async () => {
    const r = await http()
      .post("/api/auth/login")
      .set("X-Gass-Client", "web")
      .send({ identifier: operator.nip, password: "test-password" })
      .expect(201);
    const cookies = r.headers["set-cookie"] as unknown as string[];
    const old = cookies
      .find((c) => c.startsWith("gass_refresh="))!
      .split(";")[0];
    expect(cookies.every((c) => c.includes("HttpOnly"))).toBe(true);
    const refreshed = await http()
      .post("/api/auth/refresh")
      .set("X-Gass-Client", "web")
      .set("Cookie", old)
      .expect(201);
    await http()
      .post("/api/auth/refresh")
      .set("X-Gass-Client", "web")
      .set("Cookie", old)
      .expect(401);
    const next = (refreshed.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("gass_refresh="))!
      .split(";")[0];
    await http()
      .post("/api/auth/logout")
      .set("X-Gass-Client", "web")
      .set("Cookie", next)
      .expect(201);
    await http()
      .post("/api/auth/refresh")
      .set("X-Gass-Client", "web")
      .set("Cookie", next)
      .expect(401);
  });
  test("disabled users lose current access immediately", async () => {
    await db.user.update({
      where: { id: operator.id },
      data: { isActive: false },
    });
    await call("get", "/auth/me", "operator").expect(401);
  });
});
