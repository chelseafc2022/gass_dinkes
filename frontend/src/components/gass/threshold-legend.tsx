import { monthNames } from "./navigation";
import { number } from "@/lib/api";

export interface ThresholdRule {
  triwulan: number;
  hijauMin: number;
  kuningMin: number | null;
}

export const quarterLabel = (quarter: number) =>
  `Triwulan ${["I", "II", "III", "IV"][quarter - 1]}${quarter === 4 ? " (tahun)" : ""}`;

export function ThresholdRanges({ rule }: { rule: ThresholdRule }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
      <span className="text-emerald-700 dark:text-emerald-300">
        <strong>Hijau:</strong> ≥{number(rule.hijauMin)}%
      </span>
      {rule.kuningMin !== null && (
        <span className="text-amber-700 dark:text-amber-300">
          <strong>Kuning:</strong> {number(rule.kuningMin)}%–&lt;
          {number(rule.hijauMin)}%
        </span>
      )}
      <span className="text-rose-700 dark:text-rose-300">
        <strong>Merah:</strong> &lt;{number(rule.kuningMin ?? rule.hijauMin)}%
      </span>
    </div>
  );
}

export function ThresholdLegend({
  rule,
  through,
}: {
  rule?: ThresholdRule;
  through?: number;
}) {
  if (!rule) return null;
  return (
    <div
      className="mb-5 space-y-2 rounded-xl border bg-card p-4"
      aria-label="Aturan threshold kinerja"
    >
      <p className="text-sm font-semibold">
        Threshold kinerja · {quarterLabel(rule.triwulan)}
      </p>
      <ThresholdRanges rule={rule} />
      <p className="text-xs text-muted-foreground">
        Capaian kumulatif Januari–
        {monthNames[(through ?? rule.triwulan * 3) - 1]} ÷ target tahunan ×
        100%. Berlaku untuk seluruh indikator.
      </p>
    </div>
  );
}
