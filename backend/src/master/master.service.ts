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
import { EgovService } from "../auth/egov.service";
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
  constructor(
    private db: PrismaService,
    private egov: EgovService,
  ) {}
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

    // Auto-sync bidang dari SIMPEG secara transparan agar selalu mengikuti pejabat terbaru
    if (kind === "bidang" && !q.search) {
      try {
        await this.syncSimpegBidang(u);
      } catch {
        // Fallback aman ke data lokal jika server SIMPEG sedang offline
      }
    }

    // Auto-sync kecamatan dari E-Gov jika data lokal masih kosong
    if (kind === "kecamatan") {
      try {
        const count = await this.db.kecamatan.count();
        if (count === 0) {
          await this.syncEgovKecamatan(u);
        }
      } catch {
        // Fallback aman ke data lokal jika koneksi E-Gov sedang offline
      }
    }

    // Auto-sync faskes dari SIMPEG jika data lokal masih kosong
    if (kind === "faskes") {
      try {
        const count = await this.db.faskes.count();
        if (count === 0) {
          await this.syncSimpegFaskes(u);
        }
      } catch {
        // Fallback aman ke data lokal jika server SIMPEG sedang offline
      }
    }

    if (q.search) where[c.name] = { contains: q.search, mode: "insensitive" };
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy: { [c.name]: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        ...(kind === "indikator"
          ? { include: { bidang: true, satuan: true } }
          : kind === "faskes"
            ? { include: { kecamatan: true } }
            : {}),
      }),
      model.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEgovKecamatanList() {
    return this.egov.getKecamatanKonsel();
  }

  async syncEgovKecamatan(u: Actor) {
    assertWriter(u);
    const egovItems = await this.egov.getKecamatanKonsel();
    const results: any[] = [];
    let changedCount = 0;

    for (const item of egovItems) {
      const existing = await this.db.kecamatan.findFirst({
        where: {
          OR: [
            { kodeKecamatan: item.kodeKecamatan },
            { namaKecamatan: { equals: item.namaKecamatan, mode: "insensitive" } },
          ],
        },
      });

      if (existing) {
        if (
          existing.kodeKecamatan !== item.kodeKecamatan ||
          existing.namaKecamatan !== item.namaKecamatan
        ) {
          const updated = await this.db.kecamatan.update({
            where: { id: existing.id },
            data: {
              kodeKecamatan: item.kodeKecamatan,
              namaKecamatan: item.namaKecamatan,
            },
          });
          results.push(updated);
          changedCount++;
        } else {
          results.push(existing);
        }
      } else {
        const created = await this.db.kecamatan.create({
          data: {
            kodeKecamatan: item.kodeKecamatan,
            namaKecamatan: item.namaKecamatan,
          },
        });
        results.push(created);
        changedCount++;
      }
    }

    if (changedCount > 0) {
      await this.db.auditLog.create({
        data: {
          userId: u.id,
          action: "SYNC_EGOV",
          entity: "kecamatan",
          entityId: "sync_batch",
          details: JSON.stringify({ changedCount, total: results.length }),
        },
      });
    }

    return {
      message:
        changedCount > 0
          ? `Berhasil menyinkronkan ${changedCount} data kecamatan dari E-Gov.`
          : `Data kecamatan sudah mutakhir sesuai master E-Gov (${results.length} Kecamatan).`,
      data: results,
      changedCount,
      total: results.length,
    };
  }

  async getSimpegFaskesList() {
    return this.egov.getFaskesFromSimpeg();
  }

  async syncSimpegFaskes(u: Actor) {
    assertWriter(u);
    const simpegItems = await this.egov.getFaskesFromSimpeg();

    // Pastikan master kecamatan sudah ada, jika belum lakukan sinkronisasi kecamatan dahulu
    let kecamatans = await this.db.kecamatan.findMany();
    if (kecamatans.length === 0) {
      await this.syncEgovKecamatan(u);
      kecamatans = await this.db.kecamatan.findMany();
    }

    const kecMap = new Map<string, string>();
    for (const k of kecamatans) {
      kecMap.set(k.namaKecamatan.toUpperCase().trim(), k.id);
    }
    const defaultKecId = kecamatans[0]?.id;

    const results: any[] = [];
    let changedCount = 0;

    for (const item of simpegItems) {
      const targetKecUpper = item.targetKecamatanNama.toUpperCase().trim();
      const kecId = kecMap.get(targetKecUpper) || defaultKecId;
      if (!kecId) continue;

      const existing = await this.db.faskes.findFirst({
        where: {
          namaFaskes: { equals: item.namaFaskes, mode: "insensitive" },
        },
      });

      if (existing) {
        if (
          existing.namaFaskes !== item.namaFaskes ||
          existing.jenisFaskes !== item.jenisFaskes ||
          existing.kecamatanId !== kecId ||
          (item.alamat && existing.alamat !== item.alamat)
        ) {
          const updated = await this.db.faskes.update({
            where: { id: existing.id },
            data: {
              namaFaskes: item.namaFaskes,
              jenisFaskes: item.jenisFaskes,
              kecamatanId: kecId,
              ...(item.alamat ? { alamat: item.alamat } : {}),
            },
            include: { kecamatan: true },
          });
          results.push(updated);
          changedCount++;
        } else {
          results.push(existing);
        }
      } else {
        const created = await this.db.faskes.create({
          data: {
            namaFaskes: item.namaFaskes,
            jenisFaskes: item.jenisFaskes,
            kecamatanId: kecId,
            alamat: item.alamat,
          },
          include: { kecamatan: true },
        });
        results.push(created);
        changedCount++;
      }
    }

    if (changedCount > 0) {
      await this.db.auditLog.create({
        data: {
          userId: u.id,
          action: "SYNC_SIMPEG",
          entity: "faskes",
          entityId: "sync_batch",
          details: JSON.stringify({ changedCount, total: results.length }),
        },
      });
    }

    return {
      message:
        changedCount > 0
          ? `Berhasil menyinkronkan ${changedCount} fasilitas kesehatan dari SIMPEG.`
          : `Data fasilitas kesehatan sudah mutakhir sesuai SIMPEG (${results.length} Faskes).`,
      data: results,
      changedCount,
      total: results.length,
    };
  }

  async getSimpegBidangList() {
    return this.egov.getBidangDanSekretariatDinkes();
  }

  async syncSimpegBidang(u: Actor) {
    assertWriter(u);
    const simpegItems = await this.egov.getBidangDanSekretariatDinkes();
    const results: any[] = [];
    let changedCount = 0;

    for (const item of simpegItems) {
      const existing = await this.db.penanggungJawab.findFirst({
        where: {
          OR: [
            { kodeBidang: item.kodeBidang },
            { namaBidang: { equals: item.namaBidang, mode: "insensitive" } },
          ],
        },
      });

      if (existing) {
        if (
          existing.kepalaBidang !== item.kepalaBidang ||
          existing.kodeBidang !== item.kodeBidang
        ) {
          const updated = await this.db.penanggungJawab.update({
            where: { id: existing.id },
            data: {
              kodeBidang: item.kodeBidang,
              namaBidang: item.namaBidang,
              kepalaBidang: item.kepalaBidang,
            },
          });
          results.push(updated);
          changedCount++;
        } else {
          results.push(existing);
        }
      } else {
        const created = await this.db.penanggungJawab.create({
          data: {
            kodeBidang: item.kodeBidang,
            namaBidang: item.namaBidang,
            kepalaBidang: item.kepalaBidang,
          },
        });
        results.push(created);
        changedCount++;
      }
    }

    if (changedCount > 0) {
      await this.db.auditLog.create({
        data: {
          userId: u.id,
          action: "SYNC_SIMPEG",
          entity: "bidang",
          entityId: "sync_batch",
          details: JSON.stringify({ changedCount, total: results.length }),
        },
      });
    }

    return {
      message:
        changedCount > 0
          ? `Berhasil memperbarui ${changedCount} data pejabat bidang dari SIMPEG.`
          : "Data bidang & sekretariat sudah mutakhir sesuai SIMPEG.",
      data: results,
      changedCount,
    };
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
