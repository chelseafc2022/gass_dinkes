"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  Wallet,
  Target,
  ArrowRight,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardPrintDialog } from "@/components/gass/dashboard-print-dialog";
import { exportDashboardToXlsx } from "@/lib/export-excel";
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
  ReferenceLine,
} from "recharts";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/gass/providers";
import {
  ErrorState,
  GlobalFilters,
  initialFilters,
  Loading,
  StatusBadge,
} from "@/components/gass/shared";
import { api, number, percent, queryString, rupiah, shortFaskes } from "@/lib/api";
const colors: Record<string, string> = {
  HIJAU: "#0c9586",
  KUNING: "#e4af54",
  MERAH: "#dd7775",
};
function Trend({
  indicators,
  category,
  faskesName,
}: {
  indicators: any[];
  category: string;
  faskesName?: string;
}) {
  const [selected, setSelected] = useState("all");
  const items = indicators.filter((i) => i.kategori === category);
  const isAll = selected === "all";
  const chosenItem = !isAll ? items.find((i) => i.id === selected) : null;

  // Data per triwulan: TW 1, TW 2, TW 3, TW 4
  const data = [0, 1, 2, 3].map((q) => {
    const twNumber = q + 1;
    const target = twNumber * 25; // Target kumulatif standar: 25%, 50%, 75%, 100%

    if (isAll) {
      const values = items.map((i) => i.trend?.[q]?.value ?? 0);
      const avg =
        values.length > 0
          ? values.reduce((sum, val) => sum + val, 0) / values.length
          : 0;
      return {
        name: `TW ${twNumber}`,
        capaian: Number(avg.toFixed(1)),
        target,
      };
    } else {
      return {
        name: `TW ${twNumber}`,
        capaian: Number((chosenItem?.trend?.[q]?.value ?? 0).toFixed(1)),
        target,
      };
    }
  });

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="flex flex-row flex-wrap justify-between items-start gap-4 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-semibold">
              {category === "IKU"
                ? "Tren triwulanan IKU (Indikator Kinerja Utama)"
                : `Tren triwulanan ${category}`}
            </CardTitle>
            {faskesName ? (
              <Badge
                variant="outline"
                className="text-[10px] font-normal border-primary/30 bg-primary/5 text-primary inline-flex items-center gap-1"
              >
                <Building2 className="size-3" />
                {shortFaskes(faskesName)}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground font-normal">
                (Seluruh Faskes)
              </span>
            )}
            {chosenItem && (
              <StatusBadge status={chosenItem.status} compact />
            )}
          </div>
          <CardDescription className="text-xs">
            {isAll
              ? faskesName
                ? `Rata-rata kumulatif seluruh ${items.length} indikator ${category} di ${faskesName} per triwulan terhadap target tahunan`
                : `Rata-rata kumulatif seluruh ${items.length} indikator ${category} per triwulan terhadap target tahunan (agregat kabupaten)`
              : `Progres kumulatif ${chosenItem?.nama} per triwulan terhadap target tahunan`}
          </CardDescription>
        </div>

        <select
          aria-label={`Pilihan tren ${category}`}
          className="filter-select max-w-sm text-xs font-medium"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="all">
            📊 Rata-rata Seluruh {category} ({items.length} Indikator)
          </option>
          <optgroup label={`Pilih Indikator ${category}`}>
            {items.map((i, idx) => (
              <option key={i.id} value={i.id}>
                {category} {String(idx + 1).padStart(2, "0")} — {i.nama}
              </option>
            ))}
          </optgroup>
        </select>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {items.length === 0 ? (
          <div className="h-60 grid place-content-center text-xs text-muted-foreground">
            Belum ada indikator {category} untuk periode ini.
          </div>
        ) : (
          <>
            {/* Kartu Ringkasan Progres Triwulan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {data.map((d) => {
                const isReached = d.capaian >= d.target;
                const hasData = d.capaian > 0;
                return (
                  <div
                    key={d.name}
                    className={`rounded-lg p-2.5 border transition-all ${
                      hasData
                        ? isReached
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                        : "bg-muted/30 border-border/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="font-semibold">{d.name}</span>
                      <span className="text-[10px] text-muted-foreground">Target {d.target}%</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-base font-bold font-mono">
                        {percent(d.capaian)}%
                      </span>
                      {hasData ? (
                        <span
                          className={`text-[9.5px] font-medium leading-none ${
                            isReached
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {isReached ? "Tercapai" : "Kurang"}
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-muted-foreground leading-none">
                          Belum periode
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner info tambahan jika memilih indikator spesifik */}
            {chosenItem && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border text-xs">
                <span className="font-semibold text-foreground truncate max-w-md" title={chosenItem.nama}>
                  {chosenItem.nama}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                  <span>Target: <strong className="text-foreground">{number(chosenItem.target)}</strong> {chosenItem.satuan || "orang"}</span>
                  <span>·</span>
                  <span>Realisasi: <strong className="text-emerald-700 dark:text-emerald-400">{number(chosenItem.realisasi)}</strong> {chosenItem.satuan || "orang"}</span>
                  <span>·</span>
                  <span>Capaian: <strong className="text-foreground">{percent(chosenItem.persentase)}%</strong></span>
                </div>
              </div>
            )}

            {/* Grafik ComposedChart: Bar Capaian + Line Target */}
            <div className="w-full">
              <ResponsiveContainer width="100%" height={290}>
                <ComposedChart
                  data={data}
                  margin={{ top: 20, right: 16, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 4"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    fontWeight={500}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    unit="%"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (dataMax: number) => Math.max(105, Math.ceil(dataMax / 10) * 10)]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      padding: "8px 12px",
                    }}
                    formatter={(v: any, name: any) => [
                      `${percent(Number(v))}%`,
                      name === "capaian"
                        ? isAll
                          ? `Rata-rata Capaian ${category}`
                          : `Capaian Kumulatif`
                        : "Target Minimal Triwulan",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="capaian"
                    name={isAll ? `Rata-rata Capaian ${category}` : `Capaian Kumulatif`}
                    fill="#0F766E"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    <LabelList
                      dataKey="capaian"
                      position="top"
                      formatter={(v: any) => (Number(v) > 0 ? `${percent(Number(v))}%` : "")}
                      style={{ fontSize: 11, fontWeight: 700, fill: "var(--foreground)" }}
                    />
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target Kumulatif (25%, 50%, 75%, 100%)"
                    stroke="#DB2777"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: "#DB2777", strokeWidth: 2, stroke: "#FFFFFF" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const quarterBars = [
  { key: "tw1", label: "TW 1", color: "#0c9586" },
  { key: "tw2", label: "TW 2", color: "#2563eb" },
  { key: "tw3", label: "TW 3", color: "#d97706" },
  { key: "tw4", label: "TW 4", color: "#7c3aed" },
];

function AllIndicatorQuarterlyTrend({
  filters,
  facilities,
  lockedFaskesId,
  category,
}: {
  filters: ReturnType<typeof initialFilters>;
  facilities: any[];
  lockedFaskesId?: string;
  category: "SPM" | "IKU";
}) {
  const [faskesId, setFaskesId] = useState(
    lockedFaskesId || filters.faskesId || "",
  );

  useEffect(() => {
    setFaskesId(lockedFaskesId || filters.faskesId || "");
  }, [filters.faskesId, lockedFaskesId]);

  const chartQuery = useQuery({
    queryKey: [
      "dashboard-indicator-quarterly",
      filters.tahun,
      filters.bidangId,
      faskesId,
    ],
    queryFn: () =>
      api(
        `/dashboard?${queryString({
          tahun: filters.tahun,
          bidangId: filters.bidangId,
          faskesId,
        })}`,
      ),
  });
  const selectedFaskes = facilities.find((f: any) => f.id === faskesId);
  const indicators =
    chartQuery.data?.indicators.filter(
      (i: any) => i.kategori === category,
    ) ?? [];
  const data = indicators.map((indicator: any, index: number) => ({
    label: `${category} ${String(index + 1).padStart(2, "0")}`,
    nama: indicator.nama,
    ...Object.fromEntries(
      quarterBars.map((quarter, quarterIndex) => [
        quarter.key,
        indicator.trend[quarterIndex]?.value ?? 0,
      ]),
    ),
  }));

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="flex flex-row flex-wrap justify-between items-start gap-4">
        <div>
          <CardTitle className="text-sm font-semibold">
            Perbandingan triwulan seluruh {category}
          </CardTitle>
          <CardDescription className="text-xs mt-1.5">
            Empat batang pada setiap {category} menunjukkan capaian TW 1 sampai
            TW 4
            {selectedFaskes
              ? ` di ${selectedFaskes.namaFaskes}`
              : " pada seluruh fasilitas kesehatan"}
            .
          </CardDescription>
        </div>
        <select
          aria-label={`Filter fasilitas kesehatan tren seluruh ${category}`}
          className="filter-select w-full sm:w-64 text-xs font-medium"
          value={lockedFaskesId || faskesId}
          disabled={!!lockedFaskesId}
          onChange={(event) => setFaskesId(event.target.value)}
        >
          <option value="">Semua fasilitas kesehatan</option>
          {facilities.map((facility: any) => (
            <option key={facility.id} value={facility.id}>
              {facility.namaFaskes}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {chartQuery.isPending ? (
          <Skeleton className="h-80 w-full" />
        ) : chartQuery.error ? (
          <ErrorState
            error={chartQuery.error as Error}
            retry={() => chartQuery.refetch()}
          />
        ) : data.length === 0 ? (
          <div className="h-60 grid place-content-center text-xs text-muted-foreground">
            Belum ada indikator {category} untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div style={{ minWidth: Math.max(680, data.length * 64) }}>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={data}
                  margin={{ top: 12, right: 12, left: -10, bottom: 8 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 4"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="label"
                    fontSize={11}
                    fontWeight={500}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    unit="%"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(_label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.label} — ${item.nama}` : _label;
                    }}
                    formatter={(value: any, name: any) => [
                      `${percent(Number(value))}%`,
                      name,
                    ]}
                    contentStyle={{
                      background: "var(--card)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      maxWidth: 340,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  {quarterBars.map((quarter) => (
                    <Bar
                      isAnimationActive={false}
                      key={quarter.key}
                      dataKey={quarter.key}
                      name={quarter.label}
                      fill={quarter.color}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={14}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(initialFilters),
    [selected, setSelected] = useState<string>("all"),
    [showAllSpmCards, setShowAllSpmCards] = useState<boolean>(false),
    [showAllPuskesmas, setShowAllPuskesmas] = useState<boolean>(false),
    [rankingSort, setRankingSort] = useState<"asc" | "desc">("asc"),
    [printModalOpen, setPrintModalOpen] = useState<boolean>(false),
    [isExportingXlsx, setIsExportingXlsx] = useState<boolean>(false);

  const optionsQuery = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const dashboardFacilities = (optionsQuery.data?.faskes ?? []).filter(
    (f: any) =>
      f.jenisFaskes !== "RUMAH_SAKIT" &&
      !/(RUMAH\s+SAKIT|RSUD|BLUD\s+RSU)/i.test(f.namaFaskes),
  );
  const effectiveFaskesId =
    user?.role === "OPERATOR_PUSKESMAS"
      ? user.faskesId || ""
      : filters.faskesId;
  const activeFaskes = dashboardFacilities.find(
    (f: any) => f.id === effectiveFaskesId,
  );
  const activeFaskesName = activeFaskes?.namaFaskes;
  const effectiveFilters = { ...filters, faskesId: effectiveFaskesId };
  const q = useQuery({
    queryKey: ["dashboard", effectiveFilters],
    queryFn: () => api(`/dashboard?${queryString(effectiveFilters as any)}`),
  });
  const d = q.data;
  const spm = useMemo(
    () => d?.indicators.filter((i: any) => i.kategori === "SPM") ?? [],
    [d?.indicators]
  );
  const isAll = !selected || selected === "all";
  const detail = isAll ? null : spm.find((i: any) => i.id === selected) ?? null;

  // 12 SPM overall calculation per Puskesmas (matching official Excel calculation)
  const overallPuskesmasRanking = useMemo(() => {
    if (!spm.length) return [];
    const faskesMap = new Map<
      string,
      {
        faskesId: string;
        namaFaskes: string;
        namaRingkas: string;
        items: {
          indId: string;
          persentase: number;
          capped: number;
          status: string;
          reported: boolean;
          target: number;
          realisasi: number;
        }[];
      }
    >();

    for (const ind of spm) {
      for (const r of ind.ranking || []) {
        if (
          r.namaFaskes.includes("BLUD RSU KONAWE SELATAN") ||
          r.namaFaskes.toUpperCase().includes("RUMAH SAKIT") ||
          r.namaFaskes.toUpperCase().includes("RSUD") ||
          shortFaskes(r.namaFaskes) === "RSUD"
        ) {
          continue;
        }
        if (!faskesMap.has(r.faskesId)) {
          faskesMap.set(r.faskesId, {
            faskesId: r.faskesId,
            namaFaskes: r.namaFaskes,
            namaRingkas: shortFaskes(r.namaFaskes),
            items: [],
          });
        }
        faskesMap.get(r.faskesId)!.items.push({
          indId: ind.id,
          persentase: r.persentase,
          capped: Math.min(100, r.persentase),
          status: r.status,
          reported: r.reported,
          target: r.target ?? 0,
          realisasi: r.realisasi ?? 0,
        });
      }
    }

    const currentThreshold = d?.threshold?.hijauMin ?? 80;
    const kuningThreshold = d?.threshold?.kuningMin ?? 50;

    return [...faskesMap.values()].map((f) => {
      const sumCapped = f.items.reduce((s, x) => s + x.capped, 0);
      const sumTarget = f.items.reduce((s, x) => s + x.target, 0);
      const sumRealisasi = f.items.reduce((s, x) => s + x.realisasi, 0);
      const avg = sumCapped / spm.length;
      const statusStr =
        avg >= currentThreshold
          ? "HIJAU"
          : kuningThreshold !== null && avg >= kuningThreshold
            ? "KUNING"
            : "MERAH";

      return {
        faskesId: f.faskesId,
        namaFaskes: f.namaFaskes,
        namaRingkas: f.namaRingkas,
        persentase: avg,
        target: sumTarget,
        realisasi: sumRealisasi,
        status: statusStr,
        reported: f.items.some((x) => x.reported),
        tercapaiCount: f.items.filter((x) => x.status === "HIJAU").length,
        totalIndikator: spm.length,
      };
    });
  }, [spm, d?.threshold]);

  const kabupatenAvgSpm = useMemo(() => {
    if (!overallPuskesmasRanking.length) return 0;
    return (
      overallPuskesmasRanking.reduce((s, f) => s + f.persentase, 0) /
      overallPuskesmasRanking.length
    );
  }, [overallPuskesmasRanking]);

  // Priority 3 SPM indicators (lowest achievement first)
  const spmPriorityIndicators = useMemo(() => {
    return [...spm].sort((a, b) => a.persentase - b.persentase);
  }, [spm]);

  // Active ranking list for table & cards
  const activeRankingList = useMemo(() => {
    if (isAll) {
      const list = [...overallPuskesmasRanking];
      return rankingSort === "asc"
        ? list.sort((a, b) => a.persentase - b.persentase)
        : list.sort((a, b) => b.persentase - a.persentase);
    }
    const list = (detail?.ranking || [])
      .filter(
        (r: any) =>
          !r.namaFaskes.includes("BLUD RSU KONAWE SELATAN") &&
          !r.namaFaskes.toUpperCase().includes("RUMAH SAKIT") &&
          !r.namaFaskes.toUpperCase().includes("RSUD") &&
          shortFaskes(r.namaFaskes) !== "RSUD",
      )
      .map((r: any) => ({
        ...r,
        namaRingkas: shortFaskes(r.namaFaskes),
      }));
    return rankingSort === "asc"
      ? list.sort((a: any, b: any) => a.persentase - b.persentase)
      : list.sort((a: any, b: any) => b.persentase - a.persentase);
  }, [isAll, overallPuskesmasRanking, detail, rankingSort]);

  // Bar chart list (always sorted ascending from lowest to highest)
  const chartRankingList = useMemo(() => {
    if (isAll) {
      return [...overallPuskesmasRanking].sort((a, b) => a.persentase - b.persentase);
    }
    return (detail?.ranking || [])
      .filter(
        (r: any) =>
          !r.namaFaskes.includes("BLUD RSU KONAWE SELATAN") &&
          !r.namaFaskes.toUpperCase().includes("RUMAH SAKIT") &&
          !r.namaFaskes.toUpperCase().includes("RSUD") &&
          shortFaskes(r.namaFaskes) !== "RSUD",
      )
      .map((r: any) => ({
        ...r,
        namaRingkas: shortFaskes(r.namaFaskes),
      }))
      .sort((a: any, b: any) => a.persentase - b.persentase);
  }, [isAll, overallPuskesmasRanking, detail]);

  const handleExportXlsx = async () => {
    if (!d) return;
    try {
      setIsExportingXlsx(true);
      toast.loading("Membuat dokumen Excel (.xlsx)...", { id: "export-xlsx" });
      await exportDashboardToXlsx({
        tahun: filters.tahun,
        faskesName: activeFaskesName,
        summary: d.summary,
        indicators: d.indicators,
        overallPuskesmasRanking,
        programs: d.programs,
      });
      toast.success("Laporan Excel (.xlsx) berhasil diunduh!", { id: "export-xlsx" });
    } catch (err: any) {
      console.error("Gagal ekspor Excel:", err);
      toast.error("Gagal mengunduh laporan Excel.", { id: "export-xlsx" });
    } finally {
      setIsExportingXlsx(false);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-2">MONITORING & EVALUASI</p>
          <h1 className="page-heading">
            Dashboard Kinerja Kesehatan<span className="text-primary">.</span>
          </h1>
          <p className="page-description">
            Selamat datang, {user?.name}. Pantau capaian layanan dan
            perkembangan program kesehatan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-card text-xs gap-1.5 border-emerald-600/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
            disabled={!d || isExportingXlsx}
            onClick={handleExportXlsx}
            title="Unduh laporan lengkap dalam format Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            Laporan Excel (XLSX)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-card text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
            disabled={!d}
            onClick={() => setPrintModalOpen(true)}
            title="Pratinjau dan cetak laporan resmi ke format PDF"
          >
            <Printer className="size-3.5" />
            Cetak PDF
          </Button>
        </div>
      </div>
      <GlobalFilters
        value={filters}
        onChange={setFilters}
        excludeRumahSakit
        cumulative
      />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        d && (
          <>
            {/* <div className="flex items-center justify-between gap-3 text-xs rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 mb-6">
              <div className="flex gap-2 items-center">
                <span className="size-1.5 rounded-full bg-primary" />
                <span>
                  <strong>
                    {d.settings.isOtomatisAktif
                      ? "Periode input otomatis"
                      : "Mode pra-launching aktif"}
                  </strong>
                  <span className="hidden md:inline text-muted-foreground">
                    {" "}
                    ·{" "}
                    {d.settings.isOtomatisAktif
                      ? `Batas input tanggal ${d.settings.batasTanggalInput} bulan berikutnya.`
                      : "Pengisian data historis tersedia untuk melengkapi laporan."}
                  </span>
                </span>
              </div>
              <CalendarDays className="size-4 text-primary" />
            </div> */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
              {[
                {
                  label: "Fasilitas kesehatan",
                  value: number(d.summary.faskes),
                  unit: "faskes",
                  description: "Unit layanan dalam pemantauan",
                  icon: Building2,
                },
                {
                  label: "Rata-rata capaian kinerja",
                  value: percent(d.summary.capaian),
                  unit: "%",
                  description: `${d.summary.indikator} indikator pada tahun ${filters.tahun}`,
                  icon: Activity,
                },
                {
                  label: "Realisasi anggaran",
                  value: new Intl.NumberFormat("id-ID", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(d.summary.realisasiKeuangan),
                  unit: "Rp",
                  description: `${percent(d.summary.serapan)}% dari pagu anggaran`,
                  icon: Wallet,
                },
                {
                  label: "Input bulanan terverifikasi",
                  value: number(d.summary.tervalidasi),
                  unit: `/ ${d.summary.jumlahLaporan}`,
                  description: "Bulan yang telah diperiksa dari input pada periode terpilih",
                  icon: CheckCheck,
                },
              ].map((s, i) => (
                <Card key={s.label} className="gass-stat-card gap-4 py-5">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {s.label}
                      </span>
                      <span
                        className={`rounded-lg p-2 ${
                          i === 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                            : i === 1
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300"
                              : i === 2
                                ? "bg-pink-100 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300"
                                : "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-300"
                        }`}
                      >
                        <s.icon className="size-4" />
                      </span>
                    </div>
                    <div className="flex gap-2 items-baseline mt-4">
                      <span className="text-3xl font-semibold tracking-tight">
                        {s.value}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {s.unit}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      {s.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Tabs defaultValue="spm">
              <div className="mb-6 flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3 lg:w-auto">
                  <TabsTrigger
                    value="spm"
                    className="h-11 border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    <Target className="size-4" />
                    Standar pelayanan minimal
                  </TabsTrigger>
                  <TabsTrigger
                    value="iku"
                    className="h-11 border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    <Activity className="size-4" />
                    Kinerja utama
                  </TabsTrigger>
                  <TabsTrigger
                    value="keuangan"
                    className="h-11 border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                  >
                    <Wallet className="size-4" />
                    Keuangan
                  </TabsTrigger>
                </TabsList>
                {/* <span className="text-[10px] text-muted-foreground hidden lg:inline">
                  TA {filters.tahun} · Data laporan fasilitas kesehatan
                </span> */}
              </div>
              <TabsContent value="spm" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">
                        Capaian 12 indikator SPM
                      </h2>
                      
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pilih &ldquo;Semua SPM&rdquo; untuk evaluasi terpadu atau pilih indikator tertentu.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selected || "all"}
                      onValueChange={(val) => setSelected(val)}
                    >
                      <SelectTrigger className="h-9 min-w-[240px] max-w-sm text-xs bg-card">
                        <SelectValue placeholder="Pilih Indikator SPM" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        <SelectItem value="all" className="text-xs font-semibold">
                        Semua 12 SPM (Rata-rata: {percent(kabupatenAvgSpm)}%)
                        </SelectItem>
                        {spm.map((i: any, n: number) => (
                          <SelectItem key={i.id} value={i.id} className="text-xs">
                            SPM {String(n + 1).padStart(2, "0")}: {i.nama} ({percent(i.persentase)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllSpmCards((prev) => !prev)}
                      className="h-9 text-xs bg-card gap-1.5"
                    >
                      {showAllSpmCards ? (
                        <>
                          <ChevronUp className="size-3.5" />
                          Tampilkan 3 Prioritas
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" />
                          Tampilkan Semua
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {spm.length === 0 ? (
                  <div className="empty-state">
                    <Target />
                    <h2>Mulai dari indikator pelayanan</h2>
                    <p>
                      Belum ada indikator SPM pada tahun ini. Admin Dinkes dapat
                      menambahkan struktur program dan indikator dari data
                      resmi.
                    </p>
                    {user?.permissions.includes("master_indikator") && (
                      <Button asChild>
                        <Link href="/master/indikator">
                          Kelola indikator
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      {/* Summary Card "Semua 12 SPM" */}
                      <button
                        type="button"
                        onClick={() => setSelected("all")}
                        className={`rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${
                          isAll
                            ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04]"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="inline-flex items-center gap-1.5 text-[9px] tracking-wider text-primary font-bold uppercase">
                            <span className="size-1.5 rounded-full bg-primary" />
                            Gabungan 12 SPM
                          </span>
                          <span className="text-[10px] font-medium text-primary">
                            {isAll ? "Aktif" : "Pilih"}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold leading-5 text-foreground min-h-10">
                          Rata-rata Capaian Seluruh SPM
                        </h3>
                        <div className="flex justify-between items-baseline mt-4">
                          <span className="text-2xl font-bold font-mono tracking-tight">
                            {percent(kabupatenAvgSpm)}
                            <span className="text-sm font-normal text-muted-foreground ml-0.5">
                              %
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Kab. Konsel
                          </span>
                        </div>
                        <Progress
                          value={Math.min(kabupatenAvgSpm, 100)}
                          className="h-1.5 mt-3"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
                          <span>26 Puskesmas terpantau</span>
                          <span>12 Indikator</span>
                        </div>
                      </button>

                      {/* Display either 3 lowest priority SPM cards or all 12 SPM cards */}
                      {(showAllSpmCards ? spm : spmPriorityIndicators.slice(0, 3)).map(
                        (i: any, n: number) => {
                          const originalIndex = spm.findIndex((x: any) => x.id === i.id);
                          const isSelected = selected === i.id;
                          return (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => setSelected(i.id)}
                              className={`rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${
                                isSelected
                                  ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04]"
                                  : ""
                              }`}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[9px] tracking-widest text-muted-foreground font-semibold">
                                  SPM {String(originalIndex + 1).padStart(2, "0")}
                                </span>
                                {!showAllSpmCards && (
                                  <span className="text-[9px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                                    Prioritas {n + 1}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs font-semibold leading-5 min-h-10">
                                {i.nama}
                              </h3>
                              <div className="flex justify-between items-center mt-4">
                                <span className="text-2xl font-bold font-mono tracking-tight">
                                  {percent(i.persentase)}
                                  <span className="text-sm font-normal text-muted-foreground ml-0.5">
                                    %
                                  </span>
                                </span>
                                <StatusBadge status={i.status} />
                              </div>
                              <Progress
                                value={Math.min(i.persentase, 100)}
                                className="h-1.5 mt-3"
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-3">
                                <span>
                                  {number(i.realisasi)} / {number(i.target)}{" "}
                                  {i.satuan}
                                </span>
                                {/* <span>
                                  {i.tercapai}/{i.totalFaskes} tercapai
                                </span> */}
                              </div>
                            </button>
                          );
                        },
                      )}
                    </div>

                    {!showAllSpmCards && spm.length > 3 && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 -mt-2">
                        <span>
                          Menampilkan 3 dari {spm.length} indikator SPM dengan capaian terendah yang butuh perhatian.
                        </span>
                      </div>
                    )}

                    <div className="grid xl:grid-cols-[1.3fr_1fr] gap-5">
                      {/* Left: Capaian per fasilitas kesehatan */}
                      <Card>
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              Capaian per fasilitas kesehatan
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {isAll
                                ? `Rata-rata 12 indikator SPM · Rata-rata Kabupaten: ${percent(kabupatenAvgSpm)}%`
                                : detail?.nama}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                            {isAll
                              ? "12 SPM Terpadu"
                              : `Target ${number(detail?.target || 0)} ${detail?.satuan || ""}`}
                          </Badge>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart
                              data={chartRankingList}
                              margin={{ bottom: 35, top: 15 }}
                            >
                              <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 4"
                                stroke="var(--border)"
                              />
                              <XAxis
                                dataKey="namaRingkas"
                                angle={-35}
                                textAnchor="end"
                                fontSize={9}
                                interval={0}
                                height={55}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                unit="%"
                                fontSize={10}
                                axisLine={false}
                                tickLine={false}
                                domain={[
                                  0,
                                  (dataMax: number) =>
                                    Math.max(100, Math.ceil(dataMax / 10) * 10),
                                ]}
                              />
                              <Tooltip
                                cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                                content={({ active, payload }) => {
                                  if (!active || !payload || !payload.length) return null;
                                  const item = payload[0]?.payload;
                                  if (!item) return null;
                                  const satuan =
                                    !isAll && detail?.satuan && detail.satuan.toLowerCase() !== "persen"
                                      ? detail.satuan.toLowerCase()
                                      : "orang";
                                  const statusColor = colors[item.status] || "#0c9586";

                                  return (
                                    <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xl text-xs space-y-2 min-w-[210px] pointer-events-none">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="font-semibold text-foreground text-xs leading-snug">
                                            {item.namaFaskes}
                                          </p>
                                          {item.namaRingkas && item.namaRingkas !== item.namaFaskes && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                              {item.namaRingkas}
                                            </p>
                                          )}
                                        </div>
                                        <span
                                          className="size-2 rounded-full shrink-0 mt-1"
                                          style={{ backgroundColor: statusColor }}
                                          title={`Status: ${item.status}`}
                                        />
                                      </div>

                                      <div className="space-y-1.5 pt-1.5 border-t border-border/60">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-muted-foreground text-[11px]">
                                            {isAll ? "Rata-rata Capaian:" : "Capaian:"}
                                          </span>
                                          <span
                                            className="font-mono font-bold text-xs"
                                            style={{ color: statusColor }}
                                          >
                                            {percent(item.persentase)}%
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-muted-foreground text-[11px]">
                                            Jumlah Realisasi:
                                          </span>
                                          <span className="font-mono font-semibold text-foreground">
                                            {number(item.realisasi ?? 0)} {satuan}
                                          </span>
                                        </div>

                                        {(item.target ?? 0) > 0 && (
                                          <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground text-[11px]">
                                              Target Sasaran:
                                            </span>
                                            <span className="font-mono text-muted-foreground">
                                              {number(item.target ?? 0)} {satuan}
                                            </span>
                                          </div>
                                        )}

                                        {isAll && item.tercapaiCount !== undefined && (
                                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-[10.5px]">
                                            <span className="text-muted-foreground">Indikator Tercapai:</span>
                                            <span className="font-semibold text-foreground">
                                              {item.tercapaiCount}/{item.totalIndikator || 12} SPM
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <ReferenceLine
                                y={100}
                                stroke="var(--muted-foreground)"
                                strokeDasharray="4 4"
                                opacity={0.5}
                                label={{
                                  value: "Target 100%",
                                  position: "insideTopRight",
                                  fontSize: 9,
                                  fill: "var(--muted-foreground)",
                                }}
                              />
                              <Bar
                                isAnimationActive={false}
                                dataKey="persentase"
                                name="Capaian"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={36}
                              >
                                {chartRankingList.map((r: any) => (
                                  <Cell
                                    key={r.faskesId}
                                    fill={colors[r.status] || "#0c9586"}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Right: Prioritas pembinaan / Tabel Peringkat */}
                      <Card className="flex flex-col">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b bg-muted/10 pb-3">
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              {isAll ? "Prioritas Pembinaan & Peringkat" : "Prioritas Pembinaan"}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {isAll
                                ? "Urutan capaian rata-rata 12 indikator SPM (26 Puskesmas)"
                                : `Urutan capaian ${detail?.nama || "indikator"}`}
                            </CardDescription>
                          </div>
                          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setRankingSort("asc")}
                              className={`px-2 py-1 rounded-md transition-all font-medium ${
                                rankingSort === "asc"
                                  ? "bg-card text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Terendah (Prioritas)
                            </button>
                            <button
                              type="button"
                              onClick={() => setRankingSort("desc")}
                              className={`px-2 py-1 rounded-md transition-all font-medium ${
                                rankingSort === "desc"
                                  ? "bg-card text-foreground shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Tertinggi (Peringkat)
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                          <div
                            className={`divide-y divide-border ${
                              showAllPuskesmas
                                ? "max-h-[380px] overflow-y-auto"
                                : ""
                            }`}
                          >
                            {(showAllPuskesmas
                              ? activeRankingList
                              : activeRankingList.slice(0, 3)
                            ).map((r: any, n: number) => {
                              const rankNum = n + 1;
                              const isTopPriority = rankingSort === "asc" && rankNum <= 3;
                              const isTopAchiever = rankingSort === "desc" && rankNum <= 3;

                              return (
                                <div
                                  key={r.faskesId}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                                >
                                  <span
                                    className={`size-6 grid place-content-center rounded-md text-[11px] font-semibold font-mono shrink-0 ${
                                      isTopPriority
                                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
                                        : isTopAchiever
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50"
                                          : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {rankNum}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className="text-xs font-semibold truncate text-foreground"
                                      title={r.namaFaskes}
                                    >
                                      {r.namaRingkas}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {isAll
                                        ? `${r.tercapaiCount} dari ${r.totalIndikator} SPM tercapai`
                                        : r.reported
                                          ? `${number(r.realisasi)} dari ${number(r.target)} ${detail?.satuan || ""}`
                                          : "Belum melaporkan"}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span
                                      className="text-sm font-semibold font-mono block"
                                      style={{ color: colors[r.status] || "#0c9586" }}
                                    >
                                      {percent(r.persentase)}%
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                      {r.status === "HIJAU"
                                        ? "Tercapai"
                                        : r.status === "KUNING"
                                          ? "Cukup"
                                          : "Perlu Dibina"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {activeRankingList.length > 3 && (
                            <div className="p-2 border-t bg-muted/5 text-center">
                              <button
                                type="button"
                                onClick={() => setShowAllPuskesmas((prev) => !prev)}
                                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 py-1"
                              >
                                {showAllPuskesmas ? (
                                  <>
                                    <ChevronUp className="size-3.5" />
                                    Tampilkan 3 teratas saja
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-3.5" />
                                    Lihat semua {activeRankingList.length} Puskesmas ({activeRankingList.length - 3} lainnya)
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
                <Trend
                  indicators={d.indicators}
                  category="SPM"
                  faskesName={activeFaskesName}
                />
                <AllIndicatorQuarterlyTrend
                  filters={filters}
                  facilities={dashboardFacilities}
                  category="SPM"
                  lockedFaskesId={
                    user?.role === "OPERATOR_PUSKESMAS"
                      ? user.faskesId || undefined
                      : undefined
                  }
                />
              </TabsContent>
              <TabsContent value="iku" className="space-y-5">
                <Trend
                  indicators={d.indicators}
                  category="IKU"
                  faskesName={activeFaskesName}
                />
                <AllIndicatorQuarterlyTrend
                  filters={filters}
                  facilities={dashboardFacilities}
                  category="IKU"
                  lockedFaskesId={
                    user?.role === "OPERATOR_PUSKESMAS"
                      ? user.faskesId || undefined
                      : undefined
                  }
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Indikator kinerja utama</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d.indicators
                      .filter((i: any) => i.kategori === "IKU")
                      .map((i: any) => (
                        <div
                          key={i.id}
                          className="flex items-center justify-between border-b py-4 gap-4"
                        >
                          <div>
                            <p className="text-sm">{i.nama}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Realisasi {number(i.realisasi)} / target{" "}
                              {number(i.target)}
                            </p>
                          </div>
                          <StatusBadge status={i.status} />
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="keuangan" className="space-y-6">
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b bg-muted/20">
                    <div>
                      <CardTitle className="text-base">
                        Perbandingan Capaian Kinerja dan Keuangan
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-xs">
                        Rata-rata capaian kinerja dibandingkan dengan persentase
                        serapan keuangan tahun {filters.tahun}
                        {activeFaskesName ? ` · ${activeFaskesName}` : ""}.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <Badge
                        variant="outline"
                        className="border-primary/25 bg-primary/5 text-primary"
                      >
                        Kinerja {percent(d.summary.capaian)}%
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-blue-500/25 bg-blue-500/5 text-blue-700 dark:text-blue-300"
                      >
                        Keuangan {percent(d.summary.serapan)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <ResponsiveContainer width="100%" height={270}>
                      <BarChart
                        data={[
                          {
                            name: "Capaian kinerja",
                            value: d.summary.capaian,
                            fill: "#0F766E",
                          },
                          {
                            name: "Serapan keuangan",
                            value: d.summary.serapan,
                            fill: "#DB2777",
                          },
                        ]}
                        margin={{ top: 22, right: 16, left: -8, bottom: 4 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          strokeDasharray="3 4"
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          unit="%"
                          fontSize={10}
                          axisLine={false}
                          tickLine={false}
                          domain={[
                            0,
                            (dataMax: number) =>
                              Math.max(100, Math.ceil(dataMax / 10) * 10),
                          ]}
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            `${percent(Number(value))}%`,
                            "Capaian",
                          ]}
                          contentStyle={{
                            background: "var(--card)",
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            fontSize: 11,
                          }}
                        />
                        <ReferenceLine
                          y={100}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="4 4"
                          opacity={0.55}
                          label={{
                            value: "Target 100%",
                            position: "insideTopRight",
                            fontSize: 10,
                            fill: "var(--muted-foreground)",
                          }}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="value"
                          radius={[7, 7, 0, 0]}
                          maxBarSize={92}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(value: any) =>
                              `${percent(Number(value))}%`
                            }
                            className="fill-foreground text-xs font-semibold"
                          />
                          {[
                            { fill: "#0F766E" },
                            { fill: "#DB2777" },
                          ].map((item, index) => (
                            <Cell key={index} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base">
                      Serapan anggaran per program
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {rupiah(d.summary.realisasiKeuangan)} terealisasi dari{" "}
                      {rupiah(d.summary.targetKeuangan)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {d.programs.length === 0 ? (
                      <div className="empty-state border-0">
                        <Wallet />
                        <h2>Belum ada laporan keuangan</h2>
                        <p>
                          Rekap anggaran akan ditampilkan setelah capaian
                          keuangan diinput.
                        </p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={330}>
                          <BarChart data={d.programs}>
                            <CartesianGrid
                              vertical={false}
                              strokeDasharray="3 4"
                              stroke="var(--border)"
                            />
                            <XAxis dataKey="kode" fontSize={11} />
                            <YAxis
                              tickFormatter={(v) =>
                                new Intl.NumberFormat("id-ID", {
                                  notation: "compact",
                                }).format(v)
                              }
                              fontSize={10}
                            />
                            <Tooltip
                              formatter={(v: any) => rupiah(Number(v))}
                            />
                            <Legend />
                            <Bar
                              isAnimationActive={false}
                              dataKey="target"
                              name="Pagu anggaran"
                              fill="#d2e9e4"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              isAnimationActive={false}
                              dataKey="realisasi"
                              name="Realisasi"
                              fill="#087f73"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        {d.programs.map((p: any) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between border-t py-4 gap-4"
                          >
                            <div>
                              <p className="text-xs font-medium">{p.nama}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {rupiah(p.realisasi)} / {rupiah(p.target)}
                              </p>
                            </div>
                            <span className="font-semibold text-primary text-sm font-mono">
                              {percent(p.persentase)}%
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )
      )}
      <DashboardPrintDialog
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={d}
        filters={filters}
        faskesName={activeFaskesName}
        overallPuskesmasRanking={overallPuskesmasRanking}
        user={user}
        onExportXlsx={handleExportXlsx}
      />
    </div>
  );
}
