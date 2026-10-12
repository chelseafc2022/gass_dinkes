import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { CurrentUser, Menu } from "../auth/security";
import { EgovService } from "../auth/egov.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Actor } from "../common/policy";
import {
  ROLES,
  MENUS,
  defaultPermission,
  hardPermission,
} from "../common/policy";
const settingsSchema = z
  .object({
    batasTanggalInput: z.number().int().min(1).max(28),
    isOtomatisAktif: z.boolean(),
    mulaiOtomatisPeriode: z
      .string()
      .regex(/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/)
      .nullable(),
  })
  .strict();
const overrideSchema = z
  .object({
    tahun: z.number().int().min(2000).max(2100),
    bulan: z.number().int().min(1).max(12),
    statusOverride: z.enum(["BUKA", "TUTUP"]),
    batasKhusus: z.iso.datetime({ offset: true }).nullable(),
    keterangan: z.string().max(1000),
  })
  .strict();
const userSchema = z
  .object({
    nip: z.string().trim().min(1).max(100),
    role: z.enum(ROLES),
    faskesId: z.string().nullable(),
    bidangId: z.string().nullable(),
    email: z.email().nullable().optional(),
    isActive: z.boolean(),
  })
  .strict();
@Controller("admin")
export class AdminController {
  constructor(
    private db: PrismaService,
    private egov: EgovService,
  ) {}
  private admin(u: Actor) {
    if (u.role !== "ADMIN_DINKES") throw new ForbiddenException();
  }
  @Menu("jadwal") @Get("settings") async settings() {
    return {
      settings: (await this.db.pengaturanSistem.findUnique({
        where: { id: "default" },
      })) ?? {
        batasTanggalInput: 5,
        isOtomatisAktif: false,
        mulaiOtomatisPeriode: null,
      },
      overrides: await this.db.periodeOverride.findMany({
        orderBy: [{ tahun: "desc" }, { bulan: "asc" }],
      }),
    };
  }
  @Menu("jadwal") @Put("settings") async saveSettings(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const data = settingsSchema.parse(body);
    return this.db.$transaction(async (tx) => {
      const r = await tx.pengaturanSistem.upsert({
        where: { id: "default" },
        create: data,
        update: data,
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "UPDATE",
          entity: "settings",
          entityId: "default",
          details: JSON.stringify(data),
        },
      });
      return r;
    });
  }
  @Menu("jadwal") @Put("overrides") async override(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const b = overrideSchema.parse(body),
      data = {
        ...b,
        batasKhusus: b.batasKhusus ? new Date(b.batasKhusus) : null,
      };
    return this.db.$transaction(async (tx) => {
      const r = await tx.periodeOverride.upsert({
        where: { tahun_bulan: { tahun: b.tahun, bulan: b.bulan } },
        create: data,
        update: data,
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "OVERRIDE",
          entity: "periode",
          entityId: r.id,
          details: JSON.stringify(b),
        },
      });
      return r;
    });
  }
  @Menu("jadwal") @Delete("overrides/:id") async removeOverride(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
  ) {
    this.admin(u);
    return this.db.$transaction(async (tx) => {
      await tx.periodeOverride.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "DELETE",
          entity: "periode",
          entityId: id,
        },
      });
      return { ok: true };
    });
  }
  @Menu("otoritas") @Get("permissions") async permissions() {
    const rows = await this.db.menuPermission.findMany();
    return {
      roles: ROLES,
      menus: MENUS,
      data: ROLES.flatMap((role) =>
        MENUS.map((menuKey) => ({
          role,
          menuKey,
          canAccess:
            rows.find((r) => r.role === role && r.menuKey === menuKey)
              ?.canAccess ?? defaultPermission(role, menuKey),
          locked: role === "ADMIN_DINKES" || !hardPermission(role, menuKey),
        })),
      ),
    };
  }
  @Menu("otoritas") @Put("permissions") async permission(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const b = z
      .object({
        role: z.enum(ROLES),
        menuKey: z.enum(MENUS),
        canAccess: z.boolean(),
      })
      .strict()
      .parse(body);
    if (
      b.role === "ADMIN_DINKES" ||
      (b.canAccess && !hardPermission(b.role, b.menuKey))
    )
      throw new ForbiddenException(
        "Batas otoritas peran ini tidak dapat diubah.",
      );
    return this.db.$transaction(async (tx) => {
      const r = await tx.menuPermission.upsert({
        where: { role_menuKey: { role: b.role, menuKey: b.menuKey } },
        create: b,
        update: { canAccess: b.canAccess },
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "PERMISSION",
          entity: "menuPermission",
          entityId: r.id,
          details: JSON.stringify(b),
        },
      });
      return r;
    });
  }
  @Menu("pengguna") @Get("pegawai") lookup(@Query("q") q = "") {
    return this.egov.lookup(q);
  }
  @Menu("pengguna") @Get("users") users() {
    return this.db.user.findMany({
      include: { faskes: true, bidang: true },
      orderBy: { name: "asc" },
    });
  }
  @Menu("pengguna") @Post("users") createUser(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    return this.saveUser(u, body);
  }
  @Menu("pengguna") @Put("users/:id") updateUser(
    @CurrentUser() u: Actor,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.saveUser(u, body, id);
  }
  private async saveUser(u: Actor, body: unknown, id?: string) {
    this.admin(u);
    const b = userSchema.parse(body);
    if (id === u.id && (!b.isActive || b.role !== "ADMIN_DINKES"))
      throw new BadRequestException(
        "Anda tidak dapat menonaktifkan akses admin sendiri.",
      );
    if (
      (b.role === "OPERATOR_PUSKESMAS" && !b.faskesId) ||
      (b.role === "AKUN_BIDANG" && !b.bidangId)
    )
      throw new BadRequestException(
        "Penugasan faskes atau bidang wajib diisi.",
      );
    const existing = id
      ? await this.db.user.findUniqueOrThrow({ where: { id } })
      : null;
    if (existing && existing.nip !== b.nip)
      throw new BadRequestException("Identitas NIP tidak dapat diubah.");
    const p = existing ?? (await this.egov.profile(b.nip));
    return this.db.$transaction(async (tx) => {
      const data = {
        ...b,
        name: String(p.name),
        egovId: p.egovId ? String(p.egovId) : null,
        faskesId: b.role === "OPERATOR_PUSKESMAS" ? b.faskesId : null,
        bidangId: b.role === "AKUN_BIDANG" ? b.bidangId : null,
      };
      const r = id
        ? await tx.user.update({ where: { id }, data })
        : await tx.user.create({ data });
      if (id) await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: id ? "UPDATE" : "CREATE",
          entity: "user",
          entityId: r.id,
          details: JSON.stringify(b),
        },
      });
      return r;
    });
  }
  @Menu("audit") @Get("audit") async audit(@Query("page") raw = "1") {
    const page = Math.max(1, Number(raw) || 1),
      limit = 30;
    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.db.auditLog.count(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }
}
