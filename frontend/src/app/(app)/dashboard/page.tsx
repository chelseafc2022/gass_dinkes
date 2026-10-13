"use client";
import { useState } from "react";
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
function Trend({
  indicators,
  category,
}: {
  indicators: any[];
  category: string;
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
      <CardHeader className="flex flex-row flex-wrap justify-between items-start">
        <div>
          <CardTitle className="text-sm">Tren triwulanan {category}</CardTitle>
          <CardDescription className="text-xs mt-1.5">
            Realisasi per triwulan terhadap target tahunan
          </CardDescription>
        </div>
        <select
          aria-label={`Pilihan tren ${category}`}
          className="filter-select max-w-60"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="all">Seluruh indikator</option>
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
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
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
                }}
                formatter={(v: any) => `${number(Number(v))}%`}
              />
              {chosen.map((i, n) => (
                <Bar
                  isAnimationActive={false}
                  key={i.id}
                  dataKey={i.id}
                  name={i.nama}
                  fill={
                    ["#087f73", "#69baaa", "#e0b568", "#7b92bc", "#9a86b5"][
                      n % 5
                    ]
                  }
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
export default function Dashboard() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(initialFilters),
    [selected, setSelected] = useState("");
  const q = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => api(`/dashboard?${queryString(filters as any)}`),
  });
  const d = q.data;
  const spm = d?.indicators.filter((i: any) => i.kategori === "SPM") ?? [],
    detail = spm.find((i: any) => i.id === selected) ?? spm[0];
  const rankingList = (detail?.ranking || [])
    .filter((r: any) => !r.namaFaskes.includes("BLUD RSU KONAWE SELATAN"))
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
      <GlobalFilters value={filters} onChange={setFilters} />
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
                  label: "Laporan terverifikasi",
                  value: number(d.summary.tervalidasi),
                  unit: `/ ${d.summary.jumlahLaporan}`,
                  description: "Capaian kinerja yang telah diperiksa",
                  icon: CheckCheck,
                },
              ].map((s, i) => (
                <Card key={s.label} className="gap-4 py-5 shadow-none">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {s.label}
                      </span>
                      <span
                        className={`rounded-lg p-2 ${i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
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
              <div className="flex justify-between items-center gap-3 mb-6">
                <TabsList className="bg-muted/80">
                  <TabsTrigger value="spm" className="text-xs">
                    Standar pelayanan minimal
                  </TabsTrigger>
                  <TabsTrigger value="iku" className="text-xs">
                    Kinerja utama
                  </TabsTrigger>
                  <TabsTrigger value="keuangan" className="text-xs">
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
                <Trend indicators={d.indicators} category="SPM" />
              </TabsContent>
              <TabsContent value="iku" className="space-y-5">
                <Trend indicators={d.indicators} category="IKU" />
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
