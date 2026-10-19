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
          locked: role === "ADMIN_DINKES",
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
    if (b.role === "ADMIN_DINKES")
      throw new ForbiddenException(
        "Batas otoritas peran Admin Dinkes tidak dapat diubah.",
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
  @Menu("pengguna") @Get("pegawai/instansi") async instansiList() {
    return this.egov.getInstansiList();
  }

  @Menu("pengguna") @Get("pegawai/unit-kerja") async unitKerjaList(
    @Query("instansiId") instansiId?: string,
  ) {
    return this.egov.getUnitKerjaList(instansiId);
  }

  @Menu("pengguna") @Get("pegawai/directory") async directory(
    @Query("page") page = "1",
    @Query("limit") limit = "10",
    @Query("search") search = "",
    @Query("instansiId") instansiId?: string,
    @Query("unitKerjaId") unitKerjaId?: string,
  ) {
    const dir = await this.egov.getDirectory({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      instansiId,
      unitKerjaId,
    });

    if (dir.data.length === 0) {
      return { data: [], meta: dir.meta };
    }

    const nips = dir.data.map((d) => d.nip);
    const localUsers = await this.db.user.findMany({
      where: { nip: { in: nips } },
      include: { faskes: true, bidang: true },
    });
    const userMap = new Map(localUsers.map((u) => [u.nip, u]));

    const enriched = dir.data.map((p) => {
      const local = userMap.get(p.nip);
      return {
        ...p,
        hasGassAccess: !!local && local.isActive,
        gassRole: local?.role || null,
        gassStatus: local
          ? local.isActive
            ? "AKTIF"
            : "NONAKTIF"
          : "BELUM_DIBERI_AKSES",
        gassUserId: local?.id || null,
        faskesId: local?.faskesId || null,
        bidangId: local?.bidangId || null,
        faskes: local?.faskes || null,
        bidang: local?.bidang || null,
        email: local?.email || null,
      };
    });

    return { data: enriched, meta: dir.meta };
  }

  @Menu("pengguna") @Get("users/stats") async stats() {
    const [totalPegawai, totalActiveUsers, totalUsersInDb, unitKerjaList] =
      await Promise.all([
        this.egov.countPegawaiDinkes(),
        this.db.user.count({ where: { isActive: true } }),
        this.db.user.count(),
        this.egov.getUnitKerjaList(),
      ]);

    return {
      totalPegawai,
      totalActiveUsers,
      totalUsersInDb,
      totalWithoutAccess: Math.max(0, totalPegawai - totalActiveUsers),
      totalUnitKerja: unitKerjaList.length,
    };
  }

  @Menu("pengguna") @Get("pegawai") lookup(
    @Query("q") q = "",
    @Query("instansiId") instansiId?: string,
  ) {
    return this.egov.lookup(q, instansiId);
  }

  @Menu("pengguna") @Get("users") async users(
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") pageRaw?: string,
    @Query("limit") limitRaw?: string,
  ) {
    const where: any = {};
    if (search && search.trim() !== "") {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { nip: { contains: s, mode: "insensitive" } },
        { jabatan: { contains: s, mode: "insensitive" } },
      ];
    }
    if (role && role !== "ALL" && (ROLES as readonly string[]).includes(role)) {
      where.role = role;
    }
    if (status === "AKTIF") {
      where.isActive = true;
    } else if (status === "NONAKTIF") {
      where.isActive = false;
    }

    if (pageRaw) {
      const page = Math.max(1, Number(pageRaw) || 1);
      const limit = Math.min(100, Math.max(1, Number(limitRaw) || 10));
      const [total, data] = await Promise.all([
        this.db.user.count({ where }),
        this.db.user.findMany({
          where,
          include: { faskes: true, bidang: true },
          orderBy: { name: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const nips = data.map((u) => u.nip).filter(Boolean);
      const usernameMap = await this.egov.getUsernamesByNips(nips);
      const enriched = data.map((u) => ({
        ...u,
        username: usernameMap.get(u.nip.replace(/\s+/g, "")) || null,
      }));

      return {
        data: enriched,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      };
    }

    const allUsers = await this.db.user.findMany({
      where,
      include: { faskes: true, bidang: true },
      orderBy: { name: "asc" },
    });
    const nips = allUsers.map((u) => u.nip).filter(Boolean);
    const usernameMap = await this.egov.getUsernamesByNips(nips);
    return allUsers.map((u) => ({
      ...u,
      username: usernameMap.get(u.nip.replace(/\s+/g, "")) || null,
    }));
  }

  @Menu("pengguna") @Post("users/set-role") async setRole(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const b = z
      .object({
        nip: z.string().trim().min(1),
        role: z.enum(ROLES),
        faskesId: z.string().nullable().optional(),
        bidangId: z.string().nullable().optional(),
        email: z.string().email().nullable().optional().or(z.literal("")),
      })
      .parse(body);

    if (b.role === "OPERATOR_PUSKESMAS" && !b.faskesId) {
      throw new BadRequestException("Penugasan fasilitas kesehatan wajib dipilih.");
    }
    if (b.role === "AKUN_BIDANG" && !b.bidangId) {
      throw new BadRequestException("Penugasan bidang Dinkes wajib dipilih.");
    }

    const cleanNip = b.nip.trim().replace(/\s+/g, "");
    let user = await this.db.user.findUnique({ where: { nip: cleanNip } });

    if (!user) {
      // Ambil profil dari E-Gov / SIMPEG
      const p = await this.egov.profile(cleanNip);
      user = await this.db.user.create({
        data: {
          nip: cleanNip,
          name: p.name,
          jabatan: p.jabatan,
          egovId: p.egovId,
          email: b.email ? b.email : null,
          role: b.role,
          isActive: true,
          faskesId: b.role === "OPERATOR_PUSKESMAS" ? b.faskesId : null,
          bidangId: b.role === "AKUN_BIDANG" ? b.bidangId : null,
        },
        include: { faskes: true, bidang: true },
      });
    } else {
      user = await this.db.user.update({
        where: { id: user.id },
        data: {
          role: b.role,
          isActive: true,
          email: b.email ? b.email : user.email,
          faskesId: b.role === "OPERATOR_PUSKESMAS" ? b.faskesId : null,
          bidangId: b.role === "AKUN_BIDANG" ? b.bidangId : null,
        },
        include: { faskes: true, bidang: true },
      });
      await this.db.session.deleteMany({ where: { userId: user.id } });
    }

    await this.db.auditLog.create({
      data: {
        userId: u.id,
        action: "SET_ROLE",
        entity: "user",
        entityId: user.id,
        details: JSON.stringify(b),
      },
    });

    return {
      message: `Peran ${b.role} berhasil ditetapkan untuk ${user.name}`,
      user,
    };
  }

  @Menu("pengguna") @Post("users/revoke-role") async revokeRole(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const b = z.object({ nip: z.string().trim().min(1) }).parse(body);
    const cleanNip = b.nip.trim().replace(/\s+/g, "");

    const user = await this.db.user.findUnique({ where: { nip: cleanNip } });
    if (!user) {
      throw new BadRequestException("Pengguna tidak ditemukan dalam sistem GASS.");
    }
    if (user.id === u.id) {
      throw new BadRequestException("Anda tidak dapat mencabut hak akses akun sendiri.");
    }

    const updated = await this.db.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    await this.db.session.deleteMany({ where: { userId: user.id } });

    await this.db.auditLog.create({
      data: {
        userId: u.id,
        action: "REVOKE_ROLE",
        entity: "user",
        entityId: user.id,
        details: JSON.stringify({ nip: cleanNip }),
      },
    });

    return {
      message: `Hak akses untuk ${user.name} berhasil dicabut (Non-aktif).`,
      user: updated,
    };
  }

  @Menu("pengguna") @Post("users/reset-to-default") async resetToDefault(
    @CurrentUser() u: Actor,
    @Body() body: unknown,
  ) {
    this.admin(u);
    const b = z.object({ nip: z.string().trim().min(1) }).parse(body);
    const cleanNip = b.nip.trim().replace(/\s+/g, "");

    const user = await this.db.user.findUnique({ where: { nip: cleanNip } });
    if (!user) {
      return { message: "Pegawai memang belum memiliki peran di sistem GASS." };
    }
    if (user.id === u.id) {
      throw new BadRequestException("Anda tidak dapat menghapus akun admin sendiri.");
    }

    await this.db.session.deleteMany({ where: { userId: user.id } });
    await this.db.user.delete({ where: { id: user.id } });

    await this.db.auditLog.create({
      data: {
        userId: u.id,
        action: "RESET_TO_DEFAULT",
        entity: "user",
        entityId: user.id,
        details: JSON.stringify({ nip: cleanNip, name: user.name }),
      },
    });

    return {
      message: `Peran untuk ${user.name} berhasil dikembalikan ke default (Belum Diberi Akses).`,
    };
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
