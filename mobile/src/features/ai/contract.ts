import { z } from "zod";

const period = z.object({
  tahun: z.number().int().min(2000).max(2100),
  bulan: z.number().int().min(1).max(12).nullable(),
  triwulan: z.number().int().min(1).max(4).nullable(),
});
export const contextSchema = z.object({
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
  period,
  comparison: period.nullable(),
  entity: z.string().max(200).nullable(),
  facility: z.string().max(200).nullable(),
  limit: z.number().int().min(1).max(20),
});
export type Context = z.infer<typeof contextSchema>;
export const answerSchema = z.object({
  answer: z.string(),
  warnings: z.array(z.string()),
  retrievedAt: z.string(),
  resolvedContext: contextSchema,
  facts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      unit: z.string(),
      target: z.number(),
      realization: z.number(),
      percentage: z.number().nullable(),
      gap: z.number(),
      status: z.string(),
      submitted: z.number(),
      verified: z.number(),
      expected: z.number(),
      period: z.string(),
    }),
  ),
  source: z.object({ label: z.string(), plan: contextSchema }).nullable(),
});
export type Answer = z.infer<typeof answerSchema>;
export const responseSchema = z.discriminatedUnion("enabled", [
  answerSchema.extend({ enabled: z.literal(true), requestId: z.string() }),
  z.object({ enabled: z.literal(false), message: z.string() }),
]);
export function initialContext(
  year: number,
  month: number | null,
  quarter: number | null,
): Context {
  return contextSchema.parse({
    action: "summary",
    metric: "kinerja",
    period: { tahun: year, bulan: quarter ? null : month, triwulan: quarter },
    comparison: null,
    entity: null,
    facility: null,
    limit: 5,
  });
}
export function contextLabel(context: Context) {
  const p = context.period;
  return `${p.tahun} · ${p.triwulan ? `TW ${p.triwulan}` : p.bulan ? `Bulan ${p.bulan}` : "Setahun"} · ${context.metric}${context.entity ? ` · ${context.entity}` : ""}${context.facility ? ` · ${context.facility}` : " · Semua faskes"}`;
}
