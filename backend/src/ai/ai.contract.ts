import { z } from "zod";

export const periodSchema = z
  .object({
    tahun: z.number().int().min(2000).max(2100),
    bulan: z.number().int().min(1).max(12).nullable(),
    triwulan: z.number().int().min(1).max(4).nullable(),
  })
  .strict();

// The same strict schema validates model output and untrusted client context.
export const planSchema = z
  .object({
    action: z.enum([
      "summary",
      "achievement",
      "priority",
      "budget",
      "compare",
      "clarify",
      "unsupported",
    ]),
    metric: z.enum(["kinerja", "keuangan"]),
    period: periodSchema,
    comparison: periodSchema.nullable(),
    entity: z.string().max(200).nullable(),
    facility: z.string().max(200).nullable(),
    limit: z.number().int().min(1).max(20),
  })
  .strict();
export type Plan = z.infer<typeof planSchema>;
export type Period = z.infer<typeof periodSchema>;
export const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    context: planSchema,
  })
  .strict();

export function validPlan(value: unknown): Plan {
  const plan = planSchema.parse(value);
  for (const p of [plan.period, plan.comparison]) {
    if (p?.bulan && p.triwulan) throw new Error("Ambiguous period");
  }
  return plan;
}

export function periodLabel(p: Period, metric: Plan["metric"]) {
  const end = p.bulan ?? (p.triwulan ? p.triwulan * 3 : 12);
  if (metric === "kinerja")
    return `Januari–bulan ${end} ${p.tahun} (kumulatif)`;
  return `${p.bulan ? `Bulan ${p.bulan}` : p.triwulan ? `Triwulan ${p.triwulan}` : "Setahun"} ${p.tahun}`;
}

export interface Fact {
  id: string;
  label: string;
  unit: string;
  target: number;
  realization: number;
  percentage: number | null;
  gap: number;
  status: string;
  submitted: number;
  verified: number;
  expected: number;
  period: string;
}
export interface Answer {
  answer: string;
  facts: Fact[];
  warnings: string[];
  resolvedContext: Plan;
  retrievedAt: string;
  source: { label: string; plan: Plan } | null;
}
