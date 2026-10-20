import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
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
  scoringQuarter,
} from "../common/policy";
import { ThresholdService } from "../master/threshold.service";
import { EgovService } from "../auth/egov.service";
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
  kategori: z.enum(["SPM", "IKU", "IKK", "INDIKATOR_PROGRAM"]).optional(),
  search: z.string().optional(),
});
export type Filter = z.infer<typeof filters>;
const monthlyInclude = {
  orderBy: { bulan: "asc" as const },
  include: { verifiedBy: { select: { id: true, name: true } } },
};
@Injectable()
export class ReportsService {
  constructor(
    private db: PrismaService,
    private thresholds: ThresholdService,
    private egov?: EgovService,
  ) {}
  private indicatorWhere(u: Actor, q: Filter) {
    const b = u.role === "AKUN_BIDANG" ? u.bidangId : q.bidangId;
    if (u.role === "AKUN_BIDANG" && !b)
      throw new ForbiddenException("Bidang belum ditetapkan.");
    return {
      ...(q.kategori ? { kategoriIndikator: q.kategori } : {}),
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
              verifikasiBulanan: monthlyInclude,
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
            orderBy: [
              { indikator: { subKegiatan: { kodeSubKegiatan: "asc" } } },
              { faskes: { namaFaskes: "asc" } },
            ],
          })
        : await this.db.capaianKeuangan.findMany({
            where,
            include: {
              faskes: true,
              verifikasiBulanan: monthlyInclude,
              subKegiatan: {
                include: { kegiatan: { include: { program: true } } },
              },
            },
            orderBy: { updatedAt: "desc" },
          });
    const rules = kind === "kinerja" ? await this.thresholds.rules() : [];
    const threshold = rules.find((rule) => rule.triwulan === scoringQuarter(q));
    // Lists are already scoped to the responsible bidang via indicatorWhere/subWhere.
    const data = rows.map((r) => ({
      ...this.summarize(r, kind, q, threshold),
      canVerify: ["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role),
    }));
    const available =
      kind === "kinerja"
        ? await this.db.indikator.findMany({
            where: this.indicatorWhere(u, q),
            include: { satuan: true, subKegiatan: true },
            orderBy: { subKegiatan: { kodeSubKegiatan: "asc" } },
          })
        : await this.db.subKegiatan.findMany({
            where: this.subWhere(u, q),
            include: {
              kegiatan: true,
              indikator: { select: { kategoriIndikator: true } },
            },
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
      ...(threshold
        ? {
            threshold,
            thresholdRules: rules,
            cumulativeThrough: q.bulan ?? scoringQuarter(q) * 3,
          }
        : {}),
      ...(await this.periods(u, q.tahun)),
    };
  }
  private selectedMonths(q: Filter, cumulative = false) {
    if (cumulative) return MONTHS.slice(0, q.bulan ?? scoringQuarter(q) * 3);
    return MONTHS.filter((_, i) =>
      q.bulan
        ? i === q.bulan - 1
        : q.triwulan
          ? Math.floor(i / 3) === q.triwulan - 1
          : true,
    );
  }
  private summarize(
    r: any,
    kind: string,
    q: Filter,
    threshold?: { hijauMin: number; kuningMin: number | null },
  ) {
    const monthly = r.verifikasiBulanan ?? [];
    const target = Number(
        kind === "kinerja" ? r.targetKinerja : r.targetKeuangan,
      );
    const months = this.selectedMonths(q, kind === "kinerja");
    const realisasi = months.reduce((s, k) => {
      const monthNum = MONTHS.indexOf(k) + 1;
      const isVerified = monthly.some(
        (m: { bulan: number; isValidated: boolean }) =>
          m.bulan === monthNum && m.isValidated,
      );
      return isVerified ? s + Number(r[k]) : s;
    }, 0);
    const realisasiGross = months.reduce((s, k) => s + Number(r[k]), 0);
    return {
      ...r,
      verifikasiBulanan: monthly,
      submittedMonths: monthly.length,
      verifiedMonths: monthly.filter(
        (m: { isValidated: boolean }) => m.isValidated,
      ).length,
      isValidated:
        monthly.length > 0 &&
        monthly.every((m: { isValidated: boolean }) => m.isValidated),
      ...Object.fromEntries(MONTHS.map((k) => [k, Number(r[k])])),
      target,
      realisasi,
      realisasiGross,
      persentase: percentage(realisasi, target),
      status: status(realisasi, target, threshold),
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
          include: { verifikasiBulanan: true },
        });
        const monthlyModel =
          kind === "kinerja"
            ? "verifikasiKinerjaBulanan"
            : "verifikasiKeuanganBulanan";
        const previousMonth = before?.verifikasiBulanan.find(
          (m: any) => m.bulan === b.bulan,
        );
        const targetChanged =
          b.target !== undefined &&
          Number(before?.[targetKey] ?? 0) !== b.target;
        const monthChanged =
          b.bulan !== undefined &&
          (!previousMonth || Number(before?.[MONTHS[b.bulan - 1]]) !== b.nilai);
        if (
          u.role === "OPERATOR_PUSKESMAS" &&
          ((monthChanged && previousMonth?.isValidated) ||
            (targetChanged &&
              before?.verifikasiBulanan.some((m: any) => m.isValidated)))
        )
          throw new ForbiddenException(
            targetChanged
              ? "Target tahunan memengaruhi bulan yang sudah diverifikasi. Hubungi penanggung jawab indikator atau Admin Dinkes."
              : "Bulan ini sudah diverifikasi dan dikunci. Hubungi penanggung jawab indikator atau Admin Dinkes untuk koreksi.",
          );
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
        if (targetChanged) {
          await (tx as any)[monthlyModel].updateMany({
            where: { capaianId: item.id },
            data: {
              isValidated: false,
              verifiedById: null,
              verifiedAt: null,
              legacyVerification: false,
            },
          });
        }
        if (b.bulan && monthChanged) {
          const monthlyData = {
            submittedAt: new Date(),
            isValidated: false,
            verifiedAt: null,
            verifiedById: null,
            legacyVerification: false,
          };
          await (tx as any)[monthlyModel].upsert({
            where: { capaianId_bulan: { capaianId: item.id, bulan: b.bulan } },
            create: { capaianId: item.id, bulan: b.bulan, ...monthlyData },
            update: monthlyData,
          });
        }
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
    body: unknown,
  ) {
    if (!["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role))
      throw new ForbiddenException(
        "Verifikasi hanya oleh Admin Dinkes atau penanggung jawab indikator.",
      );
    const b = z
      .object({
        bulan: z.number().int().min(1).max(12),
        validated: z.boolean(),
        nilai: z.number().finite().min(0).max(1e14),
        target: z.number().finite().min(0).max(1e14),
      })
      .strict()
      .parse(body);
    const model = kind === "kinerja" ? "capaianKinerja" : "capaianKeuangan";
    const monthlyModel =
      kind === "kinerja"
        ? "verifikasiKinerjaBulanan"
        : "verifikasiKeuanganBulanan";
    return this.db.$transaction(
      async (tx) => {
        if (u.role === "AKUN_BIDANG" && !u.bidangId)
          throw new ForbiddenException("Bidang belum ditetapkan.");
        const responsibility = { bidang: { some: { bidangId: u.bidangId! } } };
        const row = await (tx as any)[model].findFirst({
          where: {
            id,
            ...(u.role === "AKUN_BIDANG"
              ? kind === "kinerja"
                ? { indikator: responsibility }
                : { subKegiatan: { indikator: { some: responsibility } } }
              : {}),
          },
          include: { verifikasiBulanan: true },
        });
        if (!row)
          throw new ForbiddenException(
            "Laporan tidak ditemukan atau bukan tanggung jawab bidang Anda.",
          );
        const previous = row.verifikasiBulanan.find(
          (m: any) => m.bulan === b.bulan,
        );
        if (!previous)
          throw new BadRequestException(
            "Bulan ini belum diinput oleh fasilitas kesehatan.",
          );
        const targetKey =
          kind === "kinerja" ? "targetKinerja" : "targetKeuangan";
        if (
          Number(row[MONTHS[b.bulan - 1]]) !== b.nilai ||
          Number(row[targetKey]) !== b.target
        )
          throw new ConflictException(
            "Nilai atau target berubah. Muat ulang laporan sebelum melakukan verifikasi.",
          );
        const r = await (tx as any)[monthlyModel].update({
          where: { capaianId_bulan: { capaianId: id, bulan: b.bulan } },
          data: {
            isValidated: b.validated,
            verifiedById: b.validated ? u.id : null,
            verifiedAt: b.validated ? new Date() : null,
            legacyVerification: false,
          },
          include: { verifiedBy: { select: { id: true, name: true } } },
        });
        await tx.auditLog.create({
          data: {
            userId: u.id,
            action: b.validated ? "VERIFY" : "UNVERIFY",
            entity: model,
            entityId: id,
            details: JSON.stringify({
              bulan: b.bulan,
              tahun: row.tahun,
              nilai: b.nilai,
              target: b.target,
              before: previous,
              after: r,
            }),
          },
        });
        return r;
      },
      { isolationLevel: "Serializable" },
    );
  }
  async verifyAll(
    kind: "kinerja" | "keuangan",
    id: string,
    u: Actor,
    body: unknown,
  ) {
    if (!["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role))
      throw new ForbiddenException(
        "Verifikasi hanya oleh Admin Dinkes atau penanggung jawab indikator.",
      );
    const b = z
      .object({
        validated: z.boolean().default(true),
      })
      .strict()
      .parse(body || {});
    const model = kind === "kinerja" ? "capaianKinerja" : "capaianKeuangan";
    const monthlyModel =
      kind === "kinerja"
        ? "verifikasiKinerjaBulanan"
        : "verifikasiKeuanganBulanan";
    return this.db.$transaction(
      async (tx) => {
        if (u.role === "AKUN_BIDANG" && !u.bidangId)
          throw new ForbiddenException("Bidang belum ditetapkan.");
        const responsibility = { bidang: { some: { bidangId: u.bidangId! } } };
        const row = await (tx as any)[model].findFirst({
          where: {
            id,
            ...(u.role === "AKUN_BIDANG"
              ? kind === "kinerja"
                ? { indikator: responsibility }
                : { subKegiatan: { indikator: { some: responsibility } } }
              : {}),
          },
          include: { verifikasiBulanan: true },
        });
        if (!row)
          throw new ForbiddenException(
            "Laporan tidak ditemukan atau bukan tanggung jawab bidang Anda.",
          );

        const targetMonths = row.verifikasiBulanan.filter(
          (m: any) => m.isValidated !== b.validated,
        );
        if (targetMonths.length === 0) {
          return { count: 0, message: "Tidak ada bulan yang perlu diverifikasi." };
        }

        const updated = await (tx as any)[monthlyModel].updateMany({
          where: {
            capaianId: id,
            isValidated: !b.validated,
          },
          data: {
            isValidated: b.validated,
            verifiedById: b.validated ? u.id : null,
            verifiedAt: b.validated ? new Date() : null,
            legacyVerification: false,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: u.id,
            action: b.validated ? "VERIFY_ALL" : "UNVERIFY_ALL",
            entity: model,
            entityId: id,
            details: JSON.stringify({
              tahun: row.tahun,
              affectedMonths: targetMonths.map((m: any) => m.bulan),
              count: updated.count,
            }),
          },
        });

        return { count: updated.count, success: true };
      },
      { isolationLevel: "Serializable" },
    );
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
      where: {
        ...(facilityScope(u, q.faskesId)
          ? { id: facilityScope(u, q.faskesId) }
          : {}),
        NOT: [
          {
            namaFaskes: {
              contains: "BLUD RSU KONAWE SELATAN",
              mode: "insensitive",
            },
          },
          {
            namaFaskes: {
              contains: "RUMAH SAKIT",
              mode: "insensitive",
            },
          },
          {
            namaFaskes: {
              contains: "RSUD",
              mode: "insensitive",
            },
          },
        ],
      },
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
              MONTHS.slice(0, triwulan * 3).reduce((v, m) => {
                const monthNum = MONTHS.indexOf(m) + 1;
                const isVerified = r.verifikasiBulanan?.some(
                  (vb: { bulan: number; isValidated: boolean }) =>
                    vb.bulan === monthNum && vb.isValidated,
                );
                return isVerified ? v + Number(r[m]) : v;
              }, 0),
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
        status: status(realisasi, target, k.threshold),
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
      threshold: k.threshold,
      thresholdRules: k.thresholdRules,
      cumulativeThrough: k.cumulativeThrough,
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
        tervalidasi: k.data.reduce(
          (sum, r) =>
            sum +
            r.verifikasiBulanan.filter(
              (m: any) =>
                m.isValidated && m.bulan <= (q.bulan ?? scoringQuarter(q) * 3),
            ).length,
          0,
        ),
        jumlahLaporan: k.data.reduce(
          (sum, r) =>
            sum +
            r.verifikasiBulanan.filter(
              (m: any) => m.bulan <= (q.bulan ?? scoringQuarter(q) * 3),
            ).length,
          0,
        ),
      },
      settings: k.settings,
      kepalaDinas: this.egov
        ? await this.egov.getKepalaDinas()
        : {
            nama: "NURLITA JAYA AS, S.Sos., M.Kes",
            nip: "197501042003122003",
            jabatan: "Kepala Dinas Kesehatan Kabupaten Konawe Selatan",
            pangkat: "Pembina Utama Muda, Gol. IV/c",
          },
    };
  }
}
