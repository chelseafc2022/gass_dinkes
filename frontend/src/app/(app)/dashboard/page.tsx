"use client";
import { ThresholdLegend } from "@/components/gass/threshold-legend";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Activity,
  Building2,
  Wallet,
  Target,
  ArrowRight,
  CheckCheck,
  CalendarDays,
} from "lucide-react";
import {
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
import { useAuth } from "@/components/gass/providers";
import {
  ErrorState,
  GlobalFilters,
  initialFilters,
  Loading,
  StatusBadge,
} from "@/components/gass/shared";
import { api, exportCsv, number, queryString, rupiah, shortFaskes } from "@/lib/api";
const colors: Record<string, string> = {
  HIJAU: "#0c9586",
  KUNING: "#e4af54",
  MERAH: "#dd7775",
};
const trendPalette = [
  "#0c9586",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#0d9488",
];
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
  const chosen =
    selected === "all" ? items : items.filter((i) => i.id === selected);
  const data = [0, 1, 2, 3].map((q) => ({
    name: `TW ${q + 1}`,
    ...Object.fromEntries(chosen.map((i) => [i.id, i.trend[q].value])),
  }));
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap justify-between items-start gap-4">
        <div>
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
          </div>
          <CardDescription className="text-xs mt-1.5">
            {faskesName
              ? `Realisasi kumulatif ${category} sampai akhir setiap triwulan pada ${faskesName} terhadap target tahunan`
              : `Realisasi kumulatif sampai akhir setiap triwulan terhadap target tahunan (agregat seluruh faskes)`}
          </CardDescription>
        </div>
        <select
          aria-label={`Pilihan tren ${category}`}
          className="filter-select max-w-60"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="all">Seluruh {category}</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nama}
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="h-60 grid place-content-center text-xs text-muted-foreground">
            Belum ada indikator {category} untuk periode ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
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
              <YAxis unit="%" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 11,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(v: any, name: any) => [
                  `${number(Number(v))}%`,
                  items.find((x) => x.id === name || x.nama === name)?.nama ||
                    name,
                ]}
              />
              {chosen.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {chosen.map((i, n) => (
                <Bar
                  isAnimationActive={false}
                  key={i.id}
                  dataKey={i.id}
                  name={i.nama}
                  fill={trendPalette[n % trendPalette.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={chosen.length > 3 ? 24 : 40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
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
    <Card>
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
          className="filter-select w-full sm:w-64"
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
            <div style={{ minWidth: Math.max(760, data.length * 130) }}>
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
                    fontSize={10}
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
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.nama || _label
                    }
                    formatter={(value: any, name: any) => [
                      `${number(Number(value))}%`,
                      name,
                    ]}
                    contentStyle={{
                      background: "var(--card)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 11,
                      maxWidth: 320,
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
                      maxBarSize={24}
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
    [selected, setSelected] = useState("");
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
  const spm = d?.indicators.filter((i: any) => i.kategori === "SPM") ?? [],
    detail = spm.find((i: any) => i.id === selected) ?? spm[0];
  const rankingList = (detail?.ranking || [])
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
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-2">MONITORING & EVALUASI</p>
          <h1 className="page-heading">
            Ringkasan kinerja kesehatan<span className="text-primary">.</span>
          </h1>
          <p className="page-description">
            Selamat datang, {user?.name}. Pantau capaian layanan dan
            perkembangan program kesehatan.
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-card text-xs"
          disabled={!d}
          onClick={() =>
            exportCsv(
              `ringkasan-gass-${filters.tahun}`,
              ["Indikator", "Kategori", "Target", "Realisasi", "Capaian (%)"],
              d.indicators.map((i: any) => [
                i.nama,
                i.kategori,
                i.target,
                i.realisasi,
                i.persentase,
              ]),
            )
          }
        >
          <ArrowDownToLine className="size-3.5" />
          Unduh rekap
        </Button>
      </div>
      <GlobalFilters
        value={filters}
        onChange={setFilters}
        excludeRumahSakit
        cumulative
      />
      <ThresholdLegend rule={d?.threshold} through={d?.cumulativeThrough} />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        d && (
          <>
            <div className="flex items-center justify-between gap-3 text-xs rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 mb-6">
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
            </div>
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
                  value: number(d.summary.capaian),
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
                  description: `${number(d.summary.serapan)}% dari pagu anggaran`,
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
            <Card className="mb-7 overflow-hidden">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b bg-muted/20">
                <div>
                  <CardTitle className="text-base">
                    Perbandingan Capaian Kinerjan dan Keuangan
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
                    Kinerja {number(d.summary.capaian)}%
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-blue-500/25 bg-blue-500/5 text-blue-700 dark:text-blue-300"
                  >
                    Keuangan {number(d.summary.serapan)}%
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
                        `${number(Number(value))}%`,
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
                          `${number(Number(value))}%`
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
                <span className="text-[10px] text-muted-foreground hidden lg:inline">
                  TA {filters.tahun} · Data laporan fasilitas kesehatan
                </span>
              </div>
              <TabsContent value="spm" className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-semibold">
                      Capaian indikator SPM
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pilih indikator untuk melihat fasilitas kesehatan yang
                      membutuhkan perhatian.
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-card text-[10px]">
                    {spm.length} indikator
                  </Badge>
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
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {spm.map((i: any, n: number) => (
                        <button
                          key={i.id}
                          onClick={() => setSelected(i.id)}
                          className={`rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${detail?.id === i.id ? "border-primary ring-1 ring-primary/10" : ""}`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] tracking-widest text-muted-foreground font-semibold">
                              SPM {String(n + 1).padStart(2, "0")}
                            </span>
                            <ArrowUpRight className="size-3.5 text-muted-foreground" />
                          </div>
                          <h3 className="text-xs font-semibold leading-5 min-h-10">
                            {i.nama}
                          </h3>
                          <div className="flex justify-between items-center mt-4">
                            <span className="text-2xl font-semibold">
                              {number(i.persentase)}
                              <span className="text-sm text-muted-foreground">
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
                            <span>
                              {i.tercapai}/{i.totalFaskes} tercapai
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {detail && (
                      <div className="grid xl:grid-cols-[1.3fr_1fr] gap-5">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">
                                  Capaian per fasilitas kesehatan
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {detail.nama}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={320}>
                                  <BarChart
                                    data={rankingList}
                                    margin={{ bottom: 35 }}
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
                                    />
                                    <Tooltip
                                      formatter={(v: any, _n: any, item: any) => [
                                        `${number(Number(v))}%`,
                                        item?.payload?.namaFaskes || "Capaian",
                                      ]}
                                      contentStyle={{
                                        background: "var(--card)",
                                        borderRadius: 12,
                                        border: "1px solid var(--border)",
                                        fontSize: 11,
                                      }}
                                    />
                                    <Bar
                                      isAnimationActive={false}
                                      dataKey="persentase"
                                      name="Capaian"
                                      radius={[5, 5, 0, 0]}
                                      maxBarSize={36}
                                    >
                                      {rankingList.map((r: any) => (
                                        <Cell
                                          key={r.faskesId}
                                          fill={colors[r.status]}
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">
                                  Prioritas pembinaan
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  Urutan capaian terendah hingga tertinggi
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="max-h-90 overflow-auto">
                                {rankingList.map((r: any, n: number) => (
                                  <div
                                    className="flex items-center gap-3 py-3 border-b last:border-0"
                                    key={r.faskesId}
                                  >
                                    <span className="size-7 grid place-content-center rounded-lg bg-muted text-[10px] text-muted-foreground font-semibold">
                                      {n + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-xs font-semibold truncate"
                                        title={r.namaFaskes}
                                      >
                                        {r.namaRingkas}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {r.reported
                                          ? `${number(r.realisasi)} dari ${number(r.target)}`
                                          : "Belum melaporkan"}
                                      </p>
                                    </div>
                                    <span
                                      className="text-sm font-semibold"
                                      style={{ color: colors[r.status] }}
                                    >
                                      {number(r.persentase)}%
                                    </span>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          </div>
                        )}
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
              <TabsContent value="keuangan">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Serapan anggaran per program
                    </CardTitle>
                    <CardDescription>
                      {rupiah(d.summary.realisasiKeuangan)} terealisasi dari{" "}
                      {rupiah(d.summary.targetKeuangan)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                            <span className="font-semibold text-primary text-sm">
                              {number(p.persentase)}%
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
    </div>
  );
}
