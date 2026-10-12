import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import {
  Actor,
  assertWriter,
  facilityScope,
  MONTHS,
  percentage,
  periodOpen,
  status,
} from "../common/policy";
export const filters = z.object({
  tahun: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
  faskesId: z.string().optional(),
  bidangId: z.string().optional(),
  bulan: z.coerce.number().int().min(1).max(12).optional(),
  triwulan: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().optional(),
});
export type Filter = z.infer<typeof filters>;
@Injectable()
export class ReportsService {
  constructor(private db: PrismaService) {}
  private indicatorWhere(u: Actor, q: Filter) {
    const b = u.role === "AKUN_BIDANG" ? u.bidangId : q.bidangId;
    if (u.role === "AKUN_BIDANG" && !b)
      throw new ForbiddenException("Bidang belum ditetapkan.");
    return {
      ...(b ? { bidang: { some: { bidangId: b } } } : {}),
      subKegiatan: { kegiatan: { program: { tahun: q.tahun } } },
    };
  }
  private subWhere(u: Actor, q: Filter) {
    const b = u.role === "AKUN_BIDANG" ? u.bidangId : q.bidangId;
    if (u.role === "AKUN_BIDANG" && !b)
      throw new ForbiddenException("Bidang belum ditetapkan.");
    return {
      kegiatan: {
        program: {
          tahun: q.tahun,
          ...(u.role === "OPERATOR_PUSKESMAS" ? { isAksesFaskes: true } : {}),
        },
      },
      ...(b
        ? { indikator: { some: { bidang: { some: { bidangId: b } } } } }
        : {}),
    };
  }
  async periods(u: Actor, year: number, db: any = this.db) {
    const settings = (await db.pengaturanSistem.findUnique({
      where: { id: "default" },
    })) ?? { batasTanggalInput: 5, isOtomatisAktif: false };
    const overrides = await db.periodeOverride.findMany({
      where: { tahun: year },
    });
    return {
      settings,
      months: MONTHS.map((key, i) => ({
        key,
        bulan: i + 1,
        open:
          u.role === "KEPALA_DINAS"
            ? false
            : u.role !== "OPERATOR_PUSKESMAS" ||
              periodOpen(
                year,
                i + 1,
                settings,
                overrides.find((o: any) => o.bulan === i + 1),
              ),
      })),
    };
  }
  async list(kind: "kinerja" | "keuangan", u: Actor, q: Filter) {
    const faskesId = facilityScope(u, q.faskesId);
    const where = {
      tahun: q.tahun,
      ...(faskesId ? { faskesId } : {}),
      ...(kind === "kinerja"
        ? { indikator: this.indicatorWhere(u, q) }
        : { subKegiatan: this.subWhere(u, q) }),
    };
    const rows: any[] =
      kind === "kinerja"
        ? await this.db.capaianKinerja.findMany({
            where,
            include: {
              faskes: true,
              indikator: {
                include: {
                  satuan: true,
                  bidang: true,
                  subKegiatan: {
                    include: { kegiatan: { include: { program: true } } },
                  },
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          })
        : await this.db.capaianKeuangan.findMany({
            where,
            include: {
              faskes: true,
              subKegiatan: {
                include: { kegiatan: { include: { program: true } } },
              },
            },
            orderBy: { updatedAt: "desc" },
          });
    const data = rows.map((r) => this.summarize(r, kind, q));
    const available =
      kind === "kinerja"
        ? await this.db.indikator.findMany({
            where: this.indicatorWhere(u, q),
            include: { satuan: true, subKegiatan: true },
          })
        : await this.db.subKegiatan.findMany({
            where: this.subWhere(u, q),
            include: { kegiatan: true },
          });
    return {
      data: q.search
        ? data.filter((r) =>
            `${r.label} ${r.faskes.namaFaskes}`
              .toLowerCase()
              .includes(q.search!.toLowerCase()),
          )
        : data,
      available,
      ...(await this.periods(u, q.tahun)),
    };
  }
  private selectedMonths(q: Filter) {
    return MONTHS.filter((_, i) =>
      q.bulan
        ? i === q.bulan - 1
        : q.triwulan
          ? Math.floor(i / 3) === q.triwulan - 1
          : true,
    );
  }
  private summarize(r: any, kind: string, q: Filter) {
    const target = Number(
        kind === "kinerja" ? r.targetKinerja : r.targetKeuangan,
      ),
      realisasi = this.selectedMonths(q).reduce((s, k) => s + Number(r[k]), 0);
    return {
      ...r,
      ...Object.fromEntries(MONTHS.map((k) => [k, Number(r[k])])),
      target,
      realisasi,
      persentase: percentage(realisasi, target),
      status: status(realisasi, target, r.indikator),
      label: r.indikator?.namaIndikator ?? r.subKegiatan.namaSubKegiatan,
    };
  }
  async save(kind: "kinerja" | "keuangan", u: Actor, body: unknown) {
    assertWriter(u);
    const b = z
      .object({
        entityId: z.string().min(1),
        faskesId: z.string().min(1),
        tahun: z.number().int().min(2000).max(2100),
        target: z.number().finite().min(0).max(1e14).optional(),
        bulan: z.number().int().min(1).max(12).optional(),
        nilai: z.number().finite().min(0).max(1e14).optional(),
      })
      .strict()
      .parse(body);
    if (
      (b.bulan === undefined) !== (b.nilai === undefined) ||
      (b.target === undefined && b.bulan === undefined)
    )
      throw new BadRequestException("Isi target atau realisasi bulanan.");
    facilityScope(u, b.faskesId);
    const entity =
      kind === "kinerja"
        ? await this.db.indikator.findFirst({
            where: { id: b.entityId, ...this.indicatorWhere(u, b) },
          })
        : await this.db.subKegiatan.findFirst({
            where: { id: b.entityId, ...this.subWhere(u, b) },
          });
    if (!entity)
      throw new ForbiddenException(
        "Indikator/sub kegiatan tidak tersedia untuk tahun atau kewenangan Anda.",
      );
    const field = kind === "kinerja" ? "indikatorId" : "subKegiatanId",
      model = kind === "kinerja" ? "capaianKinerja" : "capaianKeuangan",
      targetKey = kind === "kinerja" ? "targetKinerja" : "targetKeuangan";
    return this.db.$transaction(
      async (tx) => {
        const periods = await this.periods(u, b.tahun, tx);
        if (b.bulan && !periods.months[b.bulan - 1].open)
          throw new ForbiddenException("Periode laporan sudah ditutup.");
        // Targets affect all months; operators may alter them only while the whole year is open.
        if (
          b.target !== undefined &&
          u.role === "OPERATOR_PUSKESMAS" &&
          periods.months.some((p) => !p.open)
        )
          throw new ForbiddenException(
            "Perubahan target tahunan setelah penutupan periode harus melalui bidang/Admin Dinkes.",
          );
        const data: any = {
          isValidated: false,
          ...(b.target !== undefined ? { [targetKey]: b.target } : {}),
          ...(b.bulan ? { [MONTHS[b.bulan - 1]]: b.nilai } : {}),
        };
        const composite = `${field}_faskesId_tahun`;
        const before = await (tx as any)[model].findUnique({
          where: {
            [composite]: {
              [field]: b.entityId,
              faskesId: b.faskesId,
              tahun: b.tahun,
            },
          },
        });
        const item = await (tx as any)[model].upsert({
          where: {
            [composite]: {
              [field]: b.entityId,
              faskesId: b.faskesId,
              tahun: b.tahun,
            },
          },
          create: {
            [field]: b.entityId,
            faskesId: b.faskesId,
            tahun: b.tahun,
            ...data,
          },
          update: data,
        });
        await tx.auditLog.create({
          data: {
            userId: u.id,
            action: before ? "UPDATE" : "CREATE",
            entity: model,
            entityId: item.id,
            details: JSON.stringify({ before, changes: b }),
          },
        });
        return item;
      },
      { isolationLevel: "Serializable" },
    );
  }
  async verify(
    kind: "kinerja" | "keuangan",
    id: string,
    u: Actor,
    validated: boolean,
  ) {
    if (!["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role))
      throw new ForbiddenException("Verifikasi hanya oleh pembina.");
    const model = kind === "kinerja" ? "capaianKinerja" : "capaianKeuangan";
    const row = await (this.db as any)[model].findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const allowed = (
      await this.list(kind, u, { tahun: row.tahun, faskesId: row.faskesId })
    ).data.some((r) => r.id === id);
    if (!allowed) throw new ForbiddenException();
    return this.db.$transaction(async (tx) => {
      const r = await (tx as any)[model].update({
        where: { id },
        data: { isValidated: validated },
      });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: validated ? "VERIFY" : "UNVERIFY",
          entity: model,
          entityId: id,
        },
      });
      return r;
    });
  }
  async remove(kind: "kinerja" | "keuangan", id: string, u: Actor) {
    if (u.role !== "ADMIN_DINKES")
      throw new ForbiddenException("Penghapusan hanya oleh Admin Dinkes.");
    const model = kind === "kinerja" ? "capaianKinerja" : "capaianKeuangan";
    return this.db.$transaction(async (tx) => {
      const before = await (tx as any)[model].delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "DELETE",
          entity: model,
          entityId: id,
          details: JSON.stringify(before),
        },
      });
      return { ok: true };
    });
  }
  async dashboard(u: Actor, q: Filter) {
    const [k, f] = await Promise.all([
      this.list("kinerja", u, q),
      this.list("keuangan", u, q),
    ]);
    const facilities = await this.db.faskes.findMany({
      where: facilityScope(u, q.faskesId)
        ? { id: facilityScope(u, q.faskesId) }
        : {},
      select: { id: true, namaFaskes: true },
    });
    const indicators = k.available.map((ind: any) => {
      const rows = k.data.filter((r) => r.indikatorId === ind.id);
      const target = rows.reduce((s, r) => s + r.target, 0),
        realisasi = rows.reduce((s, r) => s + r.realisasi, 0);
      const ranking = facilities
        .map((fac) => {
          const r = rows.find((x) => x.faskesId === fac.id);
          return {
            faskesId: fac.id,
            namaFaskes: fac.namaFaskes,
            target: r?.target ?? 0,
            realisasi: r?.realisasi ?? 0,
            persentase: r?.persentase ?? 0,
            status: r?.status ?? "MERAH",
            reported: !!r,
          };
        })
        .sort((a, b) => a.persentase - b.persentase);
      const trend = [1, 2, 3, 4].map((triwulan) => ({
        triwulan: `TW ${triwulan}`,
        value: percentage(
          rows.reduce(
            (s, r) =>
              s +
              MONTHS.slice((triwulan - 1) * 3, triwulan * 3).reduce(
                (v, m) => v + Number(r[m]),
                0,
              ),
            0,
          ),
          target,
        ),
      }));
      return {
        id: ind.id,
        nama: ind.namaIndikator,
        kategori: ind.kategoriIndikator,
        satuan: ind.satuan.namaSatuan,
        target,
        realisasi,
        persentase: percentage(realisasi, target),
        status: status(realisasi, target, ind),
        tercapai: ranking.filter((r) => r.reported && r.status === "HIJAU")
          .length,
        totalFaskes: facilities.length,
        ranking,
        trend,
      };
    });
    const programs = new Map<string, any>();
    for (const r of f.data) {
      const p = r.subKegiatan.kegiatan.program;
      const item = programs.get(p.id) ?? {
        id: p.id,
        nama: p.namaProgram,
        kode: p.kodeProgram,
        target: 0,
        realisasi: 0,
      };
      item.target += r.target;
      item.realisasi += r.realisasi;
      programs.set(p.id, item);
    }
    const target = f.data.reduce((s, r) => s + r.target, 0),
      realisasi = f.data.reduce((s, r) => s + r.realisasi, 0);
    return {
      tahun: q.tahun,
      indicators,
      programs: [...programs.values()].map((p) => ({
        ...p,
        persentase: percentage(p.realisasi, p.target),
      })),
      summary: {
        faskes: facilities.length,
        indikator: indicators.length,
        capaian:
          k.data
            .filter((r) => r.target > 0)
            .reduce((s, r) => s + r.persentase, 0) /
          Math.max(1, k.data.filter((r) => r.target > 0).length),
        targetKeuangan: target,
        realisasiKeuangan: realisasi,
        serapan: percentage(realisasi, target),
        tervalidasi: k.data.filter((r) => r.isValidated).length,
        jumlahLaporan: k.data.length,
      },
      settings: k.settings,
    };
  }
}
