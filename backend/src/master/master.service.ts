import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import {
  Actor,
  assertWriter,
  defaultPermission,
  hardPermission,
} from "../common/policy";
const text = z.string().trim().min(1).max(2000),
  opt = z.string().trim().max(2000).nullable().optional();
const config = {
  satuan: {
    model: "satuan",
    name: "namaSatuan",
    schema: z.object({ namaSatuan: text, simbol: opt, keterangan: opt }),
  },
  program: {
    model: "program",
    name: "namaProgram",
    schema: z.object({
      kodeProgram: text,
      namaProgram: text,
      tahun: z.number().int().min(2000).max(2100),
      isAksesFaskes: z.boolean().default(false),
      bidangId: opt,
    }),
  },
  kegiatan: {
    model: "kegiatan",
    name: "namaKegiatan",
    schema: z.object({
      programId: text,
      kodeKegiatan: text,
      namaKegiatan: text,
    }),
  },
  sub_kegiatan: {
    model: "subKegiatan",
    name: "namaSubKegiatan",
    schema: z.object({
      kegiatanId: text,
      kodeSubKegiatan: text,
      namaSubKegiatan: text,
    }),
  },
  indikator: {
    model: "indikator",
    name: "namaIndikator",
    schema: z.object({
      subKegiatanId: text,
      namaIndikator: text,
      satuanId: text,
      kategoriIndikator: z.enum(["IKK", "IKU", "SPM", "INDIKATOR_PROGRAM"]),
      jenisThreshold: z
        .enum(["PERSENTASE_TARGET", "NILAI_ABSOLUT"])
        .default("PERSENTASE_TARGET"),
      thresholdHijauMin: z.number().nonnegative().default(80),
      thresholdKuningMin: z.number().nonnegative().default(50),
      thresholdMerahMax: z.number().nonnegative().default(49.9),
      bidangIds: z.array(text).min(1),
    }),
  },
  kecamatan: {
    model: "kecamatan",
    name: "namaKecamatan",
    schema: z.object({ kodeKecamatan: text, namaKecamatan: text }),
  },
  faskes: {
    model: "faskes",
    name: "namaFaskes",
    schema: z.object({
      namaFaskes: text,
      jenisFaskes: z.enum([
        "PUSKESMAS",
        "KLINIK",
        "RUMAH_SAKIT",
        "LABORATORIUM",
      ]),
      kecamatanId: text,
      alamat: opt,
    }),
  },
  bidang: {
    model: "penanggungJawab",
    name: "namaBidang",
    schema: z.object({ kodeBidang: opt, namaBidang: text, kepalaBidang: opt }),
  },
};
export type MasterKind = keyof typeof config;
@Injectable()
export class MasterService {
  constructor(private db: PrismaService) {}
  private async context(kind: string, u: Actor) {
    const c = config[kind as MasterKind];
    if (!c) throw new NotFoundException();
    const menu = `master_${kind}`;
    const p = await this.db.menuPermission.findUnique({
      where: { role_menuKey: { role: u.role, menuKey: menu } },
    });
    if (
      !hardPermission(u.role, menu) ||
      !(p?.canAccess ?? defaultPermission(u.role, menu))
    )
      throw new ForbiddenException("Akses data master tidak diizinkan.");
    let where: any = {};
    if (u.role === "AKUN_BIDANG") {
      if (!u.bidangId) throw new ForbiddenException("Bidang belum ditetapkan.");
      where =
        kind === "program"
          ? { bidangId: u.bidangId }
          : kind === "kegiatan"
            ? { program: { bidangId: u.bidangId } }
            : { kegiatan: { program: { bidangId: u.bidangId } } };
    }
    return { c, where, model: (this.db as any)[c.model] };
  }
  async list(
    kind: string,
    u: Actor,
    q: { search?: string; page?: string; limit?: string },
  ) {
    const { c, where, model } = await this.context(kind, u);
    const page = Math.max(1, Number(q.page) || 1),
      limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    if (q.search) where[c.name] = { contains: q.search, mode: "insensitive" };
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy: { [c.name]: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        ...(kind === "indikator"
          ? { include: { bidang: true, satuan: true } }
          : {}),
      }),
      model.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  async save(kind: string, u: Actor, body: unknown, id?: string) {
    assertWriter(u);
    const { c, where, model } = await this.context(kind, u);
    if (id && !(await model.findFirst({ where: { ...where, id } })))
      throw new NotFoundException();
    const parsed: any = c.schema.strict().parse(body);
    if (u.role === "AKUN_BIDANG") {
      if (kind === "program") parsed.bidangId = u.bidangId;
      else if (
        kind === "kegiatan" &&
        !(await this.db.program.findFirst({
          where: { id: parsed.programId, bidangId: u.bidangId },
        }))
      )
        throw new ForbiddenException("Program bukan kewenangan bidang Anda.");
      else if (
        kind === "sub_kegiatan" &&
        !(await this.db.kegiatan.findFirst({
          where: { id: parsed.kegiatanId, program: { bidangId: u.bidangId } },
        }))
      )
        throw new ForbiddenException("Kegiatan bukan kewenangan bidang Anda.");
    }
    if (kind === "indikator") {
      if (
        parsed.thresholdHijauMin <= parsed.thresholdKuningMin ||
        parsed.thresholdMerahMax >= parsed.thresholdKuningMin
      )
        throw new BadRequestException(
          "Batas hijau harus di atas kuning dan batas merah harus di bawah kuning.",
        );
      const ids = [...new Set(parsed.bidangIds)];
      delete parsed.bidangIds;
      parsed.bidang = {
        ...(id ? { deleteMany: {} } : {}),
        create: ids.map((bidangId) => ({ bidangId })),
      };
    }
    return this.db.$transaction(async (tx) => {
      const item = await (tx as any)[c.model][id ? "update" : "create"]({
        ...(id ? { where: { id } } : {}),
        data: parsed,
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: id ? "UPDATE" : "CREATE",
          entity: kind,
          entityId: item.id,
          details: JSON.stringify(body),
        },
      });
      return item;
    });
  }
  async remove(kind: string, u: Actor, id: string) {
    if (u.role !== "ADMIN_DINKES")
      throw new ForbiddenException("Penghapusan hanya oleh Admin Dinkes.");
    const { c, where, model } = await this.context(kind, u);
    if (!(await model.findFirst({ where: { ...where, id } })))
      throw new NotFoundException();
    return this.db.$transaction(async (tx) => {
      await (tx as any)[c.model].delete({ where: { id } });
      await tx.auditLog.create({
        data: { userId: u.id, action: "DELETE", entity: kind, entityId: id },
      });
      return { ok: true };
    });
  }
  // Restricted relation choices for permitted forms. Does not expose master-list endpoints to operators.
  async options(u: Actor) {
    const bidang = u.role === "AKUN_BIDANG" ? u.bidangId : undefined;
    const [
      faskes,
      bidangs,
      satuan,
      kecamatan,
      program,
      kegiatan,
      sub_kegiatan,
    ] = await Promise.all([
      this.db.faskes.findMany({
        where:
          u.role === "OPERATOR_PUSKESMAS"
            ? { id: u.faskesId || "__none__" }
            : {},
        select: { id: true, namaFaskes: true },
      }),
      this.db.penanggungJawab.findMany({
        where: bidang ? { id: bidang } : {},
        select: { id: true, namaBidang: true },
      }),
      u.role === "ADMIN_DINKES" ? this.db.satuan.findMany() : [],
      u.role === "ADMIN_DINKES" ? this.db.kecamatan.findMany() : [],
      ["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role)
        ? this.db.program.findMany({
            where: bidang ? { bidangId: bidang } : {},
          })
        : [],
      ["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role)
        ? this.db.kegiatan.findMany({
            where: bidang ? { program: { bidangId: bidang } } : {},
          })
        : [],
      ["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role)
        ? this.db.subKegiatan.findMany({
            where: bidang
              ? { kegiatan: { program: { bidangId: bidang } } }
              : {},
          })
        : [],
    ]);
    return {
      faskes,
      bidang: bidangs,
      satuan,
      kecamatan,
      program,
      kegiatan,
      sub_kegiatan,
    };
  }
}
