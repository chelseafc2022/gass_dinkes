import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { defaultPermission, status } from "../common/policy";
import type { Actor } from "../common/policy";
import { ReportsService } from "../reports/reports.service";
import { AiProvider } from "./ai.provider";
import { AiBudget } from "./ai.budget";
import { chatSchema, periodLabel, validPlan } from "./ai.contract";
import type { Answer, Fact, Plan, Period } from "./ai.contract";

const format = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
const normalized = (name: string) => name.trim().toLocaleLowerCase("id-ID");
const selectedMonths = (p: Period, cumulative: boolean) =>
  Array.from({ length: 12 }, (_, i) => i + 1).filter((m) =>
    cumulative
      ? m <= (p.bulan ?? (p.triwulan ?? 4) * 3)
      : p.bulan
        ? m === p.bulan
        : p.triwulan
          ? Math.ceil(m / 3) === p.triwulan
          : true,
  );

function resolveName<T>(
  items: T[],
  name: string | null,
  label: (item: T) => string,
) {
  if (!name) return items;
  const exact = items.filter(
    (item) => normalized(label(item)) === normalized(name),
  );
  return exact.length
    ? exact
    : items.filter((item) =>
        normalized(label(item)).includes(normalized(name)),
      );
}

@Injectable()
export class AiService {
  constructor(
    private reports: ReportsService,
    private db: PrismaService,
    private provider: AiProvider,
    private budget: AiBudget,
  ) {}

  async authorize(actor: Actor) {
    if (actor.role !== "KEPALA_DINAS")
      throw new ForbiddenException("Chat AI khusus Kepala Dinas.");
    const current = await this.db.user.findUnique({ where: { id: actor.id } });
    const permission = await this.db.menuPermission.findUnique({
      where: { role_menuKey: { role: "KEPALA_DINAS", menuKey: "dashboard" } },
    });
    if (
      !current?.isActive ||
      current.role !== "KEPALA_DINAS" ||
      !(permission?.canAccess ?? defaultPermission(current.role, "dashboard"))
    )
      throw new ForbiddenException("Akses dashboard tidak tersedia.");
  }

  async availability(actor: Actor) {
    await this.authorize(actor);
    return { enabled: this.provider.configured() };
  }

  async chat(actor: Actor, body: unknown) {
    await this.authorize(actor);
    const input = chatSchema.parse(body);
    try {
      validPlan(input.context);
    } catch {
      throw new BadRequestException("Konteks periode tidak valid.");
    }
    if (!this.provider.configured())
      return {
        enabled: false,
        message:
          "AI belum diaktifkan oleh pengelola. Dashboard tetap dapat digunakan.",
      };
    const requestId = randomUUID();
    const started = Date.now();
    let tokens = 0;
    let tool: string | undefined;
    let auditPlan: Plan | undefined;
    try {
      await this.budget.consume(actor.id);
      const result = await this.provider.plan(input.message, input.context);
      tokens = result.tokens;
      tool = result.plan.action;
      auditPlan = result.plan;
      const answer = await this.facts(actor, result.plan);
      await this.audit(actor.id, requestId, {
        outcome: "success",
        tool,
        tokens,
        durationMs: Date.now() - started,
        period: auditPlan.period,
        comparison: auditPlan.comparison,
        metric: auditPlan.metric,
        sourceIds: answer.facts.map((f) => f.id),
      });
      return { enabled: true, ...answer, requestId };
    } catch (error) {
      await this.audit(actor.id, requestId, {
        outcome: "failed",
        tool,
        tokens,
        durationMs: Date.now() - started,
      }).catch(() => {
        Logger.warn("AI audit unavailable", "AI");
      });
      throw error;
    }
  }

  private audit(userId: string, requestId: string, details: object) {
    return this.db.auditLog.create({
      data: {
        userId,
        action: "AI_READ",
        entity: "ai_chat",
        entityId: requestId,
        details: JSON.stringify(details),
      },
    });
  }

  async facts(actor: Actor, body: unknown): Promise<Answer> {
    await this.authorize(actor); // Recheck after model latency and on every source refresh.
    let plan: Plan;
    try {
      plan = validPlan(body);
    } catch {
      throw new BadRequestException("Filter AI tidak valid.");
    }
    const base: Answer = {
      answer: "",
      facts: [],
      warnings: [],
      resolvedContext: plan,
      retrievedAt: new Date().toISOString(),
      source: null,
    };
    if (plan.action === "unsupported")
      return {
        ...base,
        answer:
          "Saya dapat membaca kinerja, target, realisasi, dan keuangan GASS. Perubahan data, prediksi, dan penjelasan penyebab tanpa bukti tidak tersedia.",
      };
    if (
      plan.action === "clarify" ||
      (plan.action === "compare" && !plan.comparison)
    )
      return {
        ...base,
        answer:
          "Sebutkan indikator atau program, faskes bila diperlukan, serta periode yang ingin dilihat atau dibandingkan.",
      };
    if (plan.action === "budget") plan.metric = "keuangan";
    if (
      plan.action === "priority" &&
      (plan.metric !== "kinerja" || !plan.entity)
    )
      return {
        ...base,
        answer:
          "Sebutkan satu indikator kinerja untuk melihat prioritas puskesmas, agar satuan dan target dapat dibandingkan.",
      };
    if (plan.action === "compare" && plan.metric === "kinerja" && !plan.entity)
      return {
        ...base,
        answer:
          "Sebutkan satu indikator kinerja yang ingin dibandingkan antarperiode.",
      };

    const current = await this.read(actor, plan, plan.period);
    if (current.clarification)
      return { ...base, answer: current.clarification };
    const facts = [...current.facts];
    let answer = `${periodLabel(plan.period, plan.metric)}. ${plan.facility ? `Cakupan: ${plan.facility}.` : "Cakupan: seluruh faskes dalam laporan yang diizinkan."} `;
    const warnings = [
      "Target adalah target tahunan. Realisasi hanya menghitung bulan terverifikasi.",
    ];
    if (current.missingFacilities?.length)
      warnings.push(
        `Belum melapor untuk indikator ini: ${current.missingFacilities.slice(0, 20).join("; ")}${current.missingFacilities.length > 20 ? "; dan faskes lainnya" : ""}. Tidak dimasukkan ke peringkat capaian.`,
      );
    if (plan.metric === "kinerja")
      warnings.push(
        "Kinerja bersifat kumulatif sejak Januari; indikator dengan satuan berbeda tidak dijumlahkan.",
      );
    if (current.truncated)
      warnings.push(
        `Hasil dibatasi ${plan.limit} baris. Sebutkan indikator/program untuk mempersempit hasil.`,
      );
    if (plan.action === "compare") {
      const previous = await this.read(actor, plan, plan.comparison!);
      if (previous.clarification)
        return { ...base, answer: previous.clarification };
      if (previous.truncated)
        warnings.push(`Periode pembanding juga dibatasi ${plan.limit} baris.`);
      const a = facts[0],
        b = previous.facts[0];
      facts.push(...previous.facts);
      // Refuse to silently compare different programs or partial multi-program sets.
      if (!a || !b)
        answer +=
          "Data salah satu periode belum tersedia; perubahan belum dapat dihitung.";
      else if (
        normalized(a.label) !== normalized(b.label) ||
        a.unit !== b.unit ||
        current.facts.length !== 1 ||
        previous.facts.length !== 1
      )
        answer +=
          "Periksa rincian kedua periode. Sebutkan satu indikator/program dengan nama dan satuan sama untuk menghitung perubahan.";
      else {
        answer += `${a.label}: realisasi ${format(a.realization)} dibanding ${format(b.realization)} ${a.unit}; selisih ${format(a.realization - b.realization)} ${a.unit} (periode utama dikurangi pembanding).`;
        if (a.percentage !== null && b.percentage !== null)
          answer += ` Perubahan capaian ${format(a.percentage - b.percentage)} poin persentase.`;
        if (a.target !== b.target)
          warnings.push(
            "Target kedua periode berbeda; perbandingan persentase menggunakan target masing-masing.",
          );
      }
    } else if (plan.action === "priority") {
      answer +=
        "Urutan capaian terverifikasi terendah untuk indikator terpilih. Saran: konfirmasi kelengkapan pelaporan dan verifikasi sebelum menetapkan tindak lanjut.";
    } else if (facts.length === 1) {
      const f = facts[0];
      answer += `${f.label}: realisasi terverifikasi ${format(f.realization)} dari target ${format(f.target)} ${f.unit}${f.percentage === null ? "; persentase tidak dapat dihitung karena target nol" : ` (${format(f.percentage)}%)`}.`;
    } else
      answer += `Tersedia ${facts.length} rincian ${plan.metric === "kinerja" ? "indikator" : "keuangan"}.`;
    if (
      plan.action === "summary" &&
      plan.metric === "kinerja" &&
      current.average !== null &&
      current.average !== undefined
    )
      answer += ` Rata-rata capaian baris laporan dengan target positif: ${format(current.average)}% (basis sama dengan ringkasan dashboard).`;
    if (!facts.length)
      answer += " Belum ada laporan sesuai filter; ini bukan laporan nihil.";
    if (facts.some((f) => f.verified < f.expected))
      warnings.push(
        "Ada bulan yang belum dilaporkan atau belum terverifikasi. Capaian rendah belum membuktikan kinerja operasional rendah.",
      );
    if (facts.some((f) => f.target <= 0))
      warnings.push(
        "Target nol: persentase dan penilaian capaian tidak tersedia.",
      );
    return {
      ...base,
      answer,
      facts,
      warnings,
      resolvedContext: plan,
      retrievedAt: new Date().toISOString(),
      source: { label: "Laporan GASS • realisasi terverifikasi", plan },
    };
  }

  private async read(
    actor: Actor,
    plan: Plan,
    period: Period,
  ): Promise<{
    facts: Fact[];
    truncated: boolean;
    clarification?: string;
    missingFacilities?: string[];
    average?: number | null;
  }> {
    const result = await this.reports.list(plan.metric, actor, {
      tahun: period.tahun,
      ...(period.bulan ? { bulan: period.bulan } : {}),
      ...(period.triwulan ? { triwulan: period.triwulan } : {}),
    });
    let rows = result.data;
    const empty = (clarification: string) => ({
      facts: [],
      truncated: false,
      clarification,
    });
    if (plan.facility) {
      const facilities = [
        ...new Map(
          rows.map((r) => [
            r.faskesId,
            { id: r.faskesId, name: r.faskes.namaFaskes },
          ]),
        ).values(),
      ];
      const matches = resolveName(facilities, plan.facility, (f) => f.name);
      if (matches.length !== 1)
        return empty(
          matches.length
            ? `Nama faskes ambigu. Sebutkan nama lengkap: ${matches
                .slice(0, 5)
                .map((f) => f.name)
                .join("; ")}.`
            : "Faskes tidak ditemukan pada laporan periode ini. Periksa nama dan periode.",
        );
      rows = rows.filter((r) => r.faskesId === matches[0].id);
    }
    const groups = new Map<
      string,
      { id: string; name: string; unit: string; rows: typeof rows }
    >();
    for (const row of rows) {
      const program =
        plan.metric === "keuangan" ? row.subKegiatan.kegiatan.program : null;
      const id = program?.id ?? row.indikatorId;
      const group = groups.get(id) ?? {
        id,
        name: program?.namaProgram ?? row.indikator.namaIndikator,
        unit: program ? "rupiah" : row.indikator.satuan.namaSatuan,
        rows: [] as typeof rows,
      };
      group.rows.push(row);
      groups.set(id, group);
    }
    let selected = resolveName(
      [...groups.values()],
      plan.entity,
      (g) => g.name,
    );
    if (plan.entity && selected.length !== 1)
      return empty(
        selected.length
          ? `Nama indikator/program ambigu. Sebutkan nama lengkap: ${selected
              .slice(0, 5)
              .map((g) => g.name)
              .join("; ")}.`
          : "Indikator/program belum memiliki laporan yang cocok. Sebutkan nama lengkap atau periksa periode.",
      );
    let missingFacilities: string[] = [];
    if (plan.action === "priority") {
      const facilities = await this.db.faskes.findMany({
        where: {
          NOT: ["BLUD RSU KONAWE SELATAN", "RUMAH SAKIT", "RSUD"].map(
            (name) => ({
              namaFaskes: { contains: name, mode: "insensitive" as const },
            }),
          ),
        },
        select: { id: true, namaFaskes: true },
      });
      const eligible = new Set(facilities.map((f) => f.id));
      const reported = new Set(
        selected.flatMap((g) => g.rows.map((r) => r.faskesId)),
      );
      if (!plan.facility)
        missingFacilities = facilities
          .filter((f) => !reported.has(f.id))
          .map((f) => f.namaFaskes);
      selected = selected.flatMap((g) =>
        g.rows.map((r) => ({
          id: r.id,
          name: `${g.name} — ${r.faskes.namaFaskes}`,
          unit: g.unit,
          rows: [r],
        })),
      );
      selected = selected.filter((g) => eligible.has(g.rows[0].faskesId));
    }
    const months = selectedMonths(period, plan.metric === "kinerja");
    let facts = selected.map((group) => {
      const target = group.rows.reduce((sum, r) => sum + r.target, 0);
      const realization = group.rows.reduce((sum, r) => sum + r.realisasi, 0);
      const validations = group.rows
        .flatMap((r) => r.verifikasiBulanan)
        .filter((v) => months.includes(v.bulan));
      return {
        id: group.id,
        label: group.name,
        unit: group.unit,
        target,
        realization,
        percentage: target > 0 ? (realization / target) * 100 : null,
        gap: target - realization,
        status:
          target <= 0
            ? "TARGET BELUM TERSEDIA"
            : plan.metric === "kinerja"
              ? status(realization, target, result.threshold)
              : "REALISASI TERVERIFIKASI",
        submitted: validations.length,
        verified: validations.filter((v) => v.isValidated).length,
        expected: group.rows.length * months.length,
        period: periodLabel(period, plan.metric),
      };
    });
    if (plan.action === "priority")
      facts = facts.sort(
        (a, b) => (a.percentage ?? Infinity) - (b.percentage ?? Infinity),
      );
    else facts = facts.sort((a, b) => a.label.localeCompare(b.label, "id"));
    // Always include a total for an unfiltered financial question.
    if (plan.metric === "keuangan" && !plan.entity && facts.length) {
      const total = facts.reduce(
        (a, f) => ({
          ...a,
          target: a.target + f.target,
          realization: a.realization + f.realization,
          submitted: a.submitted + f.submitted,
          verified: a.verified + f.verified,
          expected: a.expected + f.expected,
        }),
        {
          ...facts[0],
          id: "keuangan-total",
          label: "Seluruh program",
          target: 0,
          realization: 0,
          submitted: 0,
          verified: 0,
          expected: 0,
        },
      );
      total.percentage =
        total.target > 0 ? (total.realization / total.target) * 100 : null;
      total.gap = total.target - total.realization;
      total.status =
        total.target > 0 ? "REALISASI TERVERIFIKASI" : "TARGET BELUM TERSEDIA";
      facts = plan.action === "compare" ? [total] : [total, ...facts];
    }
    const scoredRows = selected
      .flatMap((g) => g.rows)
      .filter((r) => r.target > 0);
    const average = scoredRows.length
      ? scoredRows.reduce((sum, r) => sum + (r.realisasi / r.target) * 100, 0) /
        scoredRows.length
      : null;
    return {
      facts: facts.slice(0, plan.limit),
      truncated: facts.length > plan.limit,
      missingFacilities,
      average,
    };
  }
}
