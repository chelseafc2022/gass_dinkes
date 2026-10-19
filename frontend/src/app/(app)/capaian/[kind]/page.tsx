"use client";
import { use, useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Download,
  CheckCheck,
  Search,
  Trash2,
  CalendarDays,
  AlertTriangle,
  ClipboardList,
  Eye,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  GlobalFilters,
  initialFilters,
  Loading,
  ErrorState,
  StatusBadge,
} from "@/components/gass/shared";
import { useAuth } from "@/components/gass/providers";
import { monthKeys, monthNames } from "@/components/gass/navigation";
import { api, write, queryString, number, rupiah, exportCsv, shortFaskes } from "@/lib/api";
import { useDebounced } from "@/hooks/use-debounced";
import { ThresholdLegend } from "@/components/gass/threshold-legend";

const indicatorCategories = [
  { value: "SPM", label: "Standar Pelayanan Minimal (SPM)" },
  { value: "IKU", label: "Kinerja Utama (IKU)" },
  { value: "IKK", label: "Kinerja Kunci (IKK)" },
  { value: "INDIKATOR_PROGRAM", label: "Indikator Program" },
];

function InlineCell({
  value,
  hasValue = true,
  label,
  disabled,
  onSave,
  className = "",
  placeholder = "0",
  max = 999999999,
}: {
  value: number;
  hasValue?: boolean;
  label?: string;
  disabled?: boolean;
  onSave: (val: number) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  max?: number;
}) {
  const [val, setVal] = useState<string>(hasValue ? String(value ?? 0) : "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setVal(hasValue ? String(value ?? 0) : "");
  }, [value, hasValue]);

  const commit = async () => {
    if (val.trim() === "") {
      setVal(hasValue ? String(value ?? 0) : "");
      return;
    }
    const parsed = Number(val);
    const num = isNaN(parsed) ? 0 : Math.max(0, parsed);
    if (hasValue && num === (value ?? 0)) return;
    try {
      setSaving(true);
      await onSave(num);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 900);
    } catch {
      setVal(hasValue ? String(value ?? 0) : "");
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return (
      <span className="block text-center text-xs font-mono font-medium text-muted-foreground select-none">
        {hasValue ? value ?? 0 : "—"}
      </span>
    );
  }

  return (
    <input
      type="number"
      aria-label={label}
      min={0}
      max={max}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      disabled={saving}
      placeholder={placeholder}
      className={`w-full h-7 text-center text-xs font-mono font-semibold rounded transition-all select-all
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        border ${
          success
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
            : saving
            ? "border-primary/40 bg-primary/10 animate-pulse text-muted-foreground"
            : "border-transparent bg-muted/30 hover:border-border hover:bg-muted/60 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none"
        } ${className}`}
    />
  );
}

export default function Capaian({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = use(params),
    money = kind === "keuangan",
    valid = ["kinerja", "keuangan"].includes(kind),
    { user } = useAuth(),
    client = useQueryClient();
  const [filters, setFilters] = useState(initialFilters),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [form, setForm] = useState<any>(null),
    [deleting, setDeleting] = useState<any>(null),
    [confirmDuplicate, setConfirmDuplicate] = useState(false),
    [sheetRow, setSheetRow] = useState<any>(null),
    [hideExisting, setHideExisting] = useState(false);
  const debounced = useDebounced(search);
  const categoryFilter = money ? "" : category;
  const q = useQuery({
    queryKey: ["capaian", kind, filters, debounced, categoryFilter],
    queryFn: () =>
      api(
        `/capaian/${kind}?${queryString({
          ...filters,
          search: debounced,
          kategori: categoryFilter,
        })}`,
      ),
    enabled: valid && !!user?.permissions.includes(`capaian_${kind}`),
  });
  const opts = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const modalFaskesId = form?.faskesId || filters.faskesId;
  // Modal choices retain the year/role scope, independently of table search/category.
  const formOptions = useQuery({
    queryKey: ["capaian", kind, filters.tahun, modalFaskesId],
    queryFn: () =>
      api(
        `/capaian/${kind}?${queryString({
          tahun: filters.tahun,
          ...(modalFaskesId ? { faskesId: modalFaskesId } : {}),
        })}`,
      ),
    enabled: !!form && valid && !!user?.permissions.includes(`capaian_${kind}`),
  });
  const availableEntities = (formOptions.data?.available ?? []).filter(
    (item: any) =>
      !form?.kategoriIndikator ||
      (money
        ? item.indikator?.some(
            (indicator: any) => indicator.kategoriIndikator === form.kategoriIndikator,
          )
        : item.kategoriIndikator === form.kategoriIndikator),
  );
  const { unreportedEntities, reportedEntities } = useMemo(() => {
    const records = formOptions.data?.data ?? q.data?.data ?? [];
    const unreported: any[] = [];
    const reported: any[] = [];
    availableEntities.forEach((item: any) => {
      const isReported = records.some(
        (r: any) =>
          (r.indikatorId ?? r.subKegiatanId) === item.id &&
          r.faskesId === form?.faskesId,
      );
      if (isReported) {
        reported.push(item);
      } else {
        unreported.push(item);
      }
    });
    return { unreportedEntities: unreported, reportedEntities: reported };
  }, [availableEntities, formOptions.data?.data, q.data?.data, form?.faskesId]);

  const existingRecord = useMemo(() => {
    if (form?.existing || !form?.entityId || !form?.faskesId) return null;
    return (
      (formOptions.data?.data ?? []).find(
        (r: any) =>
          (r.indikatorId ?? r.subKegiatanId) === form.entityId &&
          r.faskesId === form.faskesId,
      ) ??
      (q.data?.data ?? []).find(
        (r: any) =>
          (r.indikatorId ?? r.subKegiatanId) === form.entityId &&
          r.faskesId === form.faskesId,
      ) ??
      null
    );
  }, [
    form?.existing,
    form?.entityId,
    form?.faskesId,
    formOptions.data?.data,
    q.data?.data,
  ]);
  const activeSheetRow = useMemo(() => {
    if (!sheetRow) return null;
    return (q.data?.data ?? []).find((r: any) => r.id === sheetRow.id) ?? sheetRow;
  }, [sheetRow, q.data?.data]);

  const changed = () => {
    client.invalidateQueries({ queryKey: ["capaian"] });
    client.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const formReport = (formOptions.data?.data ?? q.data?.data ?? []).find(
    (r: any) => (r.indikatorId ?? r.subKegiatanId) === form?.entityId && r.faskesId === form?.faskesId,
  ) ?? form?.report;
  const targetLocked = user?.role === "OPERATOR_PUSKESMAS" && formReport?.verifikasiBulanan?.some((m: any) => m.isValidated);
  const monthLocked = user?.role === "OPERATOR_PUSKESMAS" && formReport?.verifikasiBulanan?.some((m: any) => m.bulan === form?.bulan && m.isValidated);
  const save = useMutation({
    mutationFn: () =>
      write(`/capaian/${kind}`, {
        entityId: form.entityId,
        faskesId: form.faskesId,
        tahun: filters.tahun,
        ...(form.mode === "target"
          ? { target: Number(form.target) }
          : { bulan: Number(form.bulan), nilai: Number(form.nilai) }),
      }),
    onSuccess: () => {
      changed();
      const wasUpdate = !!existingRecord;
      setForm(null);
      toast.success(
        wasUpdate
          ? "Data capaian berhasil diperbarui."
          : "Capaian berhasil disimpan.",
      );
    },
    onError: (e) => toast.error(e.message),
  });
  const verify = useMutation({
    mutationFn: ({ row, bulan, validated }: { row: any; bulan: number; validated: boolean }) =>
      write(
        `/capaian/${kind}/${row.id}/verify`,
        { bulan, validated, nilai: Number(row[monthKeys[bulan - 1]]), target: Number(row.target) },
        "POST",
      ),
    onSuccess: (_, variables) => {
      changed();
      toast.success(`Verifikasi ${monthNames[variables.bulan - 1]} ${variables.validated ? "berhasil disimpan" : "dibatalkan"}.`);
    },
    onError: (e) => { changed(); toast.error(e.message); },
  });
  const remove = useMutation({
    mutationFn: () =>
      api(`/capaian/${kind}/${deleting.id}`, { method: "DELETE" }),
    onSuccess: () => {
      changed();
      setDeleting(null);
      toast.success("Laporan dihapus.");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveInline = async (payload: {
    entityId: string;
    faskesId: string;
    tahun: number;
    bulan?: number;
    nilai?: number;
    target?: number;
  }) => {
    try {
      await write(`/capaian/${kind}`, payload);
      changed();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan capaian");
      throw e;
    }
  };
  if (!valid) return <p>Halaman tidak ditemukan.</p>;
  const readOnly = user?.role === "KEPALA_DINAS";
  const fmt = money ? rupiah : number;
  const open = (r?: any, month?: number) => {
    save.reset();
    setForm({
      entityId: r?.indikatorId ?? r?.subKegiatanId ?? "",
      faskesId: r?.faskesId ?? user?.faskesId ?? filters.faskesId,
      mode: month ? "monthly" : "target",
      target: r?.target ?? 0,
      bulan: month ?? 1,
      nilai: month ? r[monthKeys[month - 1]] : 0,
      existing: !!r,
      label: r?.label,
      report: r,
      kategoriIndikator: money ? "" : r?.indikator?.kategoriIndikator ?? category,
    });
  };
  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="eyebrow mb-2">PELAPORAN BULANAN</p>
          <h1 className="page-heading">Capaian {kind}</h1>
          <p className="page-description">
            {money
              ? "Pantau pagu dan realisasi belanja pada setiap sub kegiatan."
              : "Catat realisasi indikator dan pantau kemajuan target tahunan."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!q.data}
            onClick={() =>
              exportCsv(
                `capaian-${kind}-${filters.tahun}`,
                [
                  "Faskes",
                  money ? "Sub kegiatan" : "Indikator",
                  "Target",
                  ...monthNames,
                  "Realisasi",
                  "Capaian (%)",
                ],
                q.data.data.map((r: any) => [
                  r.faskes.namaFaskes,
                  r.label,
                  r.target,
                  ...monthKeys.map((k) => r[k]),
                  r.realisasi,
                  r.persentase,
                ]),
              )
            }
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => open()}>
              <Plus className="size-4" />
              Input capaian
            </Button>
          )}
        </div>
      </div>
      <GlobalFilters value={filters} onChange={setFilters} period={!money} cumulative={!money} />
      {!money && <ThresholdLegend rule={q.data?.threshold} through={q.data?.cumulativeThrough} />}
      {q.data?.settings && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 mb-4 mt-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <strong className="text-foreground">
                {q.data.settings.isOtomatisAktif
                  ? `Periode Penginputan Otomatis (Tgl. ${q.data.settings.batasTanggalInput})`
                  : "Mode Pra-Launching (Semua Bulan Buka)"}
              </strong>
              <span className="hidden sm:inline text-muted-foreground/60">·</span>
              <span className="text-muted-foreground text-[11px]">
                {q.data.settings.isOtomatisAktif
                  ? `Batas akhir input tanggal ${q.data.settings.batasTanggalInput} bulan berikutnya. Bulan lewat terkunci otomatis.`
                  : "Administrator membuka seluruh bulan untuk pengisian data awal & pelaporan historis."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(() => {
              const openMonths = q.data.months?.filter((m: any) => m.open) ?? [];
              const allOpen = openMonths.length === 12;
              return (
                <Badge
                  variant={allOpen ? "secondary" : "outline"}
                  className="text-[10px] font-medium h-5 px-2 bg-background/80 flex items-center gap-1"
                >
                  <CalendarDays className="size-3 text-primary" />
                  <span>
                    {allOpen
                      ? "12 Bulan Terbuka"
                      : `${openMonths.length} Bulan Buka · ${12 - openMonths.length} Terkunci`}
                  </span>
                </Badge>
              );
            })()}
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3 items-center mb-4">
        <div className="flex w-full max-w-2xl flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              aria-label="Cari laporan"
              className="pl-9 bg-card"
              placeholder="Cari indikator atau fasilitas kesehatan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!money && (
            <select
              aria-label="Kategori indikator"
              className="filter-select w-full sm:w-64"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Semua kategori indikator</option>
              {indicatorCategories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {readOnly
            ? "Mode pemantauan · hanya baca"
            : "Input angka langsung pada tabel (otomatis tersimpan saat tekan Enter atau pindah sel)."}
        </span>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="min-w-0 max-w-full rounded-xl border bg-card overflow-hidden w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs text-muted-foreground">
              <span>{q.data.data.length} laporan · Tahun {filters.tahun}</span>
              <span id="capaian-scroll-help">Geser tabel ke kanan untuk melihat seluruh bulan dan tindakan.</span>
            </div>
            <Table
              className={`w-full table-fixed text-xs ${money ? "min-w-[3080px]" : "min-w-[1872px]"}`}
              containerProps={{
                role: "region",
                "aria-label": `Tabel capaian ${kind}`,
                "aria-describedby": "capaian-scroll-help",
                tabIndex: 0,
                className: "max-h-[70vh] overscroll-contain focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]",
              }}
            >
              <colgroup>
                <col className="w-[320px]" />
                <col className={money ? "w-[180px]" : "w-[88px]"} />
                {monthKeys.map((key) => <col key={key} className={money ? "w-[176px]" : "w-[88px]"} />)}
                <col className={money ? "w-[180px]" : "w-[120px]"} />
                <col className="w-36" />
                <col className="w-36" />
              </colgroup>
              <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead scope="col" rowSpan={2} className="sm:sticky sm:left-0 z-30 bg-card border-r px-4 py-3 text-sm font-semibold whitespace-normal leading-5 text-left">
                    {money
                      ? "Sub kegiatan & kegiatan"
                      : "Indikator & sub kegiatan"}
                  </TableHead>
                  <TableHead scope="col" rowSpan={2} className="px-2 py-3 text-center text-xs whitespace-normal leading-5 bg-sky-500/10 dark:bg-sky-500/15 text-sky-950 dark:text-sky-200 border-r border-sky-200/50 dark:border-sky-800/40 font-semibold">
                    Target<span className="block font-normal">{money ? "tahunan (Rp)" : "tahunan"}</span>
                  </TableHead>
                  {["I", "II", "III", "IV"].map((quarter) => (
                    <TableHead key={quarter} scope="colgroup" colSpan={3} className="border-r px-2 py-2 text-center text-xs font-semibold whitespace-normal">
                      Triwulan {quarter}
                    </TableHead>
                  ))}
                  <TableHead scope="col" rowSpan={2} className="px-3 py-3 text-center text-xs whitespace-normal leading-5 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 border-r border-emerald-200/50 dark:border-emerald-800/40 font-semibold">
                    Realisasi<span className="block font-normal">{money ? "(Rp)" : "kumulatif"}</span>
                  </TableHead>
                  <TableHead scope="col" rowSpan={2} className="border-r px-3 py-3 text-center text-xs font-semibold whitespace-normal leading-5">
                    Capaian (%)<span className="block font-normal">Threshold{money ? "" : ` TW ${q.data?.threshold?.triwulan ?? 4}`}</span>
                  </TableHead>
                  <TableHead scope="col" rowSpan={2} className="px-3 py-3 text-center text-xs font-semibold whitespace-normal leading-5">
                    Verifikasi<span className="block font-normal">bulanan</span>
                  </TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {monthNames.map((m, i) => (
                    <TableHead key={m} scope="col" className={`px-2 py-2.5 text-center text-xs whitespace-normal ${i % 3 === 2 ? "border-r" : ""}`}>
                      <div className="font-semibold text-xs leading-5">{m.slice(0, 3)}</div>
                      <span
                        className={`inline-flex items-center justify-center text-[10px] font-medium leading-4 ${
                          q.data.months[i].open ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {q.data.months[i].open ? "BUKA" : "TUTUP"}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={17}
                      className="h-52 text-left whitespace-normal text-muted-foreground"
                    >
                      <p className="sticky left-0 w-72 max-w-full px-4 leading-6">
                        Belum ada laporan. Pilih fasilitas kesehatan dan mulai
                        input capaian.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data.data.map((r: any) => (
                    <TableRow key={r.id} className="group hover:bg-muted/20">
                      <TableCell className="sm:sticky sm:left-0 z-10 border-r bg-card px-4 py-4 align-top whitespace-normal [overflow-wrap:anywhere]">
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSheetRow(r)}
                            className="text-left font-semibold text-sm leading-5 hover:text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded cursor-pointer"
                            title={`Klik untuk membuka panel detail & verifikasi ${r.label}`}
                          >
                            {r.label}
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0 text-muted-foreground hover:text-primary"
                            title={`Buka detail & verifikasi ${r.label}`}
                            aria-label={`Detail ${r.label}`}
                            onClick={() => setSheetRow(r)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground leading-5 mt-1.5" title={r.indikator?.subKegiatan.namaSubKegiatan ?? r.subKegiatan.kegiatan.namaKegiatan}>
                          {r.indikator?.subKegiatan.namaSubKegiatan ??
                            r.subKegiatan.kegiatan.namaKegiatan}
                        </p>
                        <Badge variant="outline" className="max-w-full whitespace-normal text-left text-[11px] leading-4 mt-2 px-2 py-0.5 h-auto font-normal" title={r.faskes.namaFaskes}>
                          {shortFaskes(r.faskes.namaFaskes)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center align-middle bg-sky-500/[0.035] dark:bg-sky-500/[0.06] border-r border-sky-100/60 dark:border-sky-900/30 tabular-nums">
                        {money ? (
                          <button
                            disabled={
                              readOnly ||
                              (user?.role === "OPERATOR_PUSKESMAS" &&
                                (r.verifikasiBulanan?.some((m: any) => m.isValidated) ||
                                  q.data.months.some((p: any) => !p.open)))
                            }
                            onClick={() => open(r)}
                            className="text-xs font-mono font-medium hover:underline disabled:cursor-default"
                          >
                            {fmt(r.target)}
                          </button>
                        ) : (
                          <InlineCell
                            value={r.target}
                            disabled={
                              readOnly ||
                              (user?.role === "OPERATOR_PUSKESMAS" &&
                                (r.verifikasiBulanan?.some((m: any) => m.isValidated) ||
                                  q.data.months.some((p: any) => !p.open)))
                            }
                            max={999}
                            className="bg-transparent hover:bg-sky-500/10"
                            onSave={(val) =>
                              saveInline({
                                entityId: r.indikatorId ?? r.subKegiatanId,
                                faskesId: r.faskesId,
                                tahun: filters.tahun,
                                target: val,
                              })
                            }
                          />
                        )}
                      </TableCell>
                      {monthKeys.map((key, i) => {
                        const monthly = r.verifikasiBulanan?.find((m: any) => m.bulan === i + 1);
                        const verified = !!monthly?.isValidated;
                        const verificationTitle = verified
                          ? monthly.legacyVerification
                            ? "Verifikasi dari laporan lama; nama pemeriksa dan tanggal bulanan belum tersedia."
                            : `Diverifikasi oleh ${monthly.verifiedBy?.name ?? "pemeriksa"}${monthly.verifiedAt ? ` pada ${new Date(monthly.verifiedAt).toLocaleString("id-ID")}` : ""}`
                          : monthly ? "Menunggu verifikasi Admin Dinkes atau penanggung jawab indikator." : "Belum diinput. Nilai 0 juga perlu disimpan jika memang tidak ada realisasi.";
                        return (
                        <TableCell key={key} className={`px-2 py-3 text-center align-middle tabular-nums ${i % 3 === 2 ? "border-r" : ""}`}>
                          {money ? (
                            <button
                              className="text-xs text-center w-full rounded px-1 py-1 hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent"
                              aria-label={`Edit ${monthNames[i]} ${r.label}`}
                              disabled={
                                readOnly ||
                                !q.data.months[i].open ||
                                (user?.role === "OPERATOR_PUSKESMAS" &&
                                  verified)
                              }
                              onClick={() => open(r, i + 1)}
                            >
                              {monthly ? fmt(r[key]) : "—"}
                            </button>
                          ) : (
                            <InlineCell
                              value={r[key]}
                              hasValue={!!monthly}
                              label={`Realisasi ${monthNames[i]} ${r.label}`}
                              placeholder="—"
                              disabled={
                                readOnly ||
                                !q.data.months[i].open ||
                                (user?.role === "OPERATOR_PUSKESMAS" &&
                                  verified)
                              }
                              max={999}
                              onSave={(val) =>
                                saveInline({
                                  entityId: r.indikatorId ?? r.subKegiatanId,
                                  faskesId: r.faskesId,
                                  tahun: filters.tahun,
                                  bulan: i + 1,
                                  nilai: val,
                                })
                              }
                            />
                          )}
                          <div className="mt-2 flex flex-col items-center gap-1.5" title={verificationTitle}>
                            <span className={`text-[10px] leading-4 ${verified ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                              {verified ? "Terverifikasi" : monthly ? "Menunggu" : "Belum diisi"}
                            </span>
                            {r.canVerify && monthly && (
                              <Button
                                variant={verified ? "secondary" : "outline"}
                                size="sm"
                                className="h-7 w-full gap-1 px-1 text-[11px]"
                                aria-label={`${verified ? "Batalkan verifikasi" : "Verifikasi"} ${monthNames[i]} ${r.label} ${r.faskes.namaFaskes}`}
                                disabled={verify.isPending}
                                onClick={() => verify.mutate({ row: r, bulan: i + 1, validated: !verified })}
                              >
                                <CheckCheck className="size-3 shrink-0" />
                                {verified ? "Batal" : "Verif"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      ); })}
                      <TableCell className="px-3 py-3 text-center align-middle font-mono font-bold text-xs tabular-nums bg-emerald-500/[0.035] dark:bg-emerald-500/[0.06] border-r border-emerald-100/60 dark:border-emerald-900/30 text-emerald-950 dark:text-emerald-100">
                        {fmt(r.realisasi)}
                      </TableCell>
                      <TableCell className="border-r px-3 py-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="font-mono text-xs font-bold leading-tight">
                            {number(r.persentase)}%
                          </span>
                          <StatusBadge status={r.status} compact />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center align-middle">
                        <div className="flex flex-col gap-2 items-center justify-center whitespace-normal">
                          <span className="font-semibold">{r.verifiedMonths ?? 0}/{r.submittedMonths ?? 0} bulan</span>
                          <span className="text-[11px] text-muted-foreground">terverifikasi dari bulan yang diinput</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-full gap-1 text-[11px] font-medium border-primary/30 text-primary hover:bg-primary/5"
                            onClick={() => setSheetRow(r)}
                            aria-label={`Detail dan verifikasi ${r.label}`}
                          >
                            <Eye className="size-3 shrink-0" />
                            Panel Verif
                          </Button>
                          {user?.role === "ADMIN_DINKES" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label="Hapus laporan"
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            * Verifikasi dilakukan per bulan. Bulan terverifikasi terkunci bagi faskes. Koreksi realisasi membatalkan verifikasi bulan tersebut; perubahan target tahunan membatalkan seluruh verifikasi bulan.
          </p>
        </>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {form?.existing ? "Perbarui" : "Input"} capaian {kind}
            </DialogTitle>
            <DialogDescription className="break-words">
              {form?.label ||
                `Laporan tahun ${filters.tahun}. Pilih target atau realisasi bulanan.`}
              {" "}Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (existingRecord && !form.existing) {
                  setConfirmDuplicate(true);
                  return;
                }
                save.mutate();
              }}
              className="min-w-0 space-y-4"
            >
              <div className="field grid min-w-0 max-w-full gap-2">
                <Label htmlFor="facility">Fasilitas kesehatan *</Label>
                <select
                  id="facility"
                  required
                  className="filter-select w-full min-w-0 max-w-full truncate"
                  disabled={
                    form.existing || user?.role === "OPERATOR_PUSKESMAS"
                  }
                  value={form.faskesId}
                  onChange={(e) =>
                    setForm({ ...form, faskesId: e.target.value })
                  }
                >
                  <option value="">Pilih fasilitas</option>
                  {opts.data?.faskes.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.namaFaskes}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field grid min-w-0 max-w-full gap-2">
                <Label htmlFor="indicator-category">Kategori indikator</Label>
                <select
                  id="indicator-category"
                  className="filter-select w-full min-w-0 max-w-full truncate"
                  disabled={form.existing}
                  value={form.kategoriIndikator}
                  onChange={(e) => setForm({ ...form, kategoriIndikator: e.target.value, entityId: "" })}
                  aria-describedby={money ? "category-help" : undefined}
                >
                  <option value="">Semua kategori indikator</option>
                  {indicatorCategories.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                {money && (
                  <p id="category-help" className="text-xs text-muted-foreground">
                    Saring sub kegiatan berdasarkan kategori indikator terkait. Anggaran tetap dicatat per sub kegiatan.
                  </p>
                )}
              </div>
              <div className="field grid min-w-0 max-w-full gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="entity">
                    {money ? "Sub kegiatan" : "Indikator"} *
                  </Label>
                  {!form.existing && form.faskesId && reportedEntities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHideExisting(!hideExisting)}
                      className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {hideExisting ? "Tampilkan semua" : "Hanya belum diinput"}
                      <span className="text-muted-foreground">({unreportedEntities.length} tersisa)</span>
                    </button>
                  )}
                </div>
                <select
                  id="entity"
                  required
                  className={`filter-select w-full min-w-0 max-w-full truncate ${
                    existingRecord
                      ? "border-amber-400 dark:border-amber-600 focus:border-amber-500 focus:ring-amber-500 bg-amber-500/5"
                      : ""
                  }`}
                  disabled={form.existing || formOptions.isPending || !!formOptions.error}
                  value={form.entityId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const alreadyExists = (
                      formOptions.data?.data ?? q.data?.data ?? []
                    ).find(
                      (r: any) =>
                        (r.indikatorId ?? r.subKegiatanId) === selectedId &&
                        r.faskesId === form.faskesId,
                    );
                    if (alreadyExists && !form.existing) {
                      toast.warning(
                        `${money ? "Sub kegiatan" : "Indikator"} ini sudah pernah diinputkan untuk fasilitas kesehatan ini pada tahun ${filters.tahun}.`,
                      );
                    }
                    setForm({ ...form, entityId: selectedId });
                  }}
                >
                  <option value="">
                    Pilih {money ? "sub kegiatan" : "indikator"}
                  </option>
                  {form.existing && !availableEntities.some((i: any) => i.id === form.entityId) && (
                    <option value={form.entityId}>{form.label}</option>
                  )}
                  {hideExisting ? (
                    <>
                      {unreportedEntities.map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.namaIndikator ?? i.namaSubKegiatan}
                        </option>
                      ))}
                      {form.entityId && reportedEntities.some((i: any) => i.id === form.entityId) && (
                        <option value={form.entityId}>
                          {reportedEntities.find((i: any) => i.id === form.entityId)?.namaIndikator ??
                            reportedEntities.find((i: any) => i.id === form.entityId)?.namaSubKegiatan}{" "}
                          (Sudah ada di daftar)
                        </option>
                      )}
                    </>
                  ) : reportedEntities.length > 0 ? (
                    <>
                      {unreportedEntities.length > 0 && (
                        <optgroup label="✨ Belum Diinput (Rekomendasi)">
                          {unreportedEntities.map((i: any) => (
                            <option key={i.id} value={i.id}>
                              {i.namaIndikator ?? i.namaSubKegiatan}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="⚠️ Sudah Ada di Daftar (Pembaruan)">
                        {reportedEntities.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.namaIndikator ?? i.namaSubKegiatan} (Sudah ada di daftar)
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    availableEntities.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.namaIndikator ?? i.namaSubKegiatan}
                      </option>
                    ))
                  )}
                </select>
                {formOptions.isPending ? (
                  <p role="status" className="text-xs text-muted-foreground">Memuat pilihan…</p>
                ) : formOptions.error ? (
                  <p role="alert" className="text-xs text-destructive">Pilihan gagal dimuat. <button type="button" className="underline" onClick={() => formOptions.refetch()}>Coba lagi</button></p>
                ) : !availableEntities.length && !form.existing ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    Tidak ada {money ? "sub kegiatan" : "indikator"} yang tersedia{form.kategoriIndikator ? " untuk kategori ini" : ""}.
                  </p>
                ) : !form.existing && form.faskesId && availableEntities.length > 0 && unreportedEntities.length === 0 ? (
                  <p role="status" className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    Semua {money ? "sub kegiatan" : "indikator"} untuk fasilitas ini telah terdaftar di tahun ini. Anda dapat memilih dari daftar di atas untuk memperbarui data.
                  </p>
                ) : null}
                {existingRecord && (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 text-amber-950 dark:text-amber-200 text-xs flex gap-3 items-start animate-in fade-in slide-in-from-top-1"
                  >
                    <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-xs text-amber-900 dark:text-amber-100">
                          Perhatian: {money ? "Sub kegiatan" : "Indikator"} Sudah Pernah Diinput
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 shrink-0 font-medium"
                        >
                          Sudah Ada
                        </Badge>
                      </div>
                      <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                        {money ? "Sub kegiatan" : "Indikator"}{" "}
                        <strong>{existingRecord.label}</strong> sudah ada dalam daftar capaian untuk{" "}
                        <strong>
                          {existingRecord.faskes?.namaFaskes ||
                            opts.data?.faskes.find((f: any) => f.id === form.faskesId)?.namaFaskes ||
                            "fasilitas kesehatan ini"}
                        </strong>{" "}
                        pada tahun {filters.tahun}.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 px-2.5 bg-amber-100/70 dark:bg-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800/60 text-[11px] font-mono">
                        <div>
                          <span className="text-muted-foreground text-[10px] font-sans">Target Saat Ini: </span>
                          <strong className="text-amber-950 dark:text-amber-100">{fmt(existingRecord.target)}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] font-sans">Total Realisasi: </span>
                          <strong className="text-amber-950 dark:text-amber-100">{fmt(existingRecord.realisasi)}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] font-sans">Capaian: </span>
                          <strong className="text-amber-950 dark:text-amber-100">{number(existingRecord.persentase)}%</strong>
                        </div>
                      </div>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                        Menyimpan kembali akan <strong>memperbarui / menimpa</strong> data capaian indikator ini.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="field grid min-w-0 max-w-full gap-2">
                <Label htmlFor="mode">Jenis pengisian *</Label>
                <select
                  id="mode"
                  className="filter-select w-full min-w-0 max-w-full truncate"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option
                    value="target"
                    disabled={
                      user?.role === "OPERATOR_PUSKESMAS" &&
                      (targetLocked || q.data?.months.some((p: any) => !p.open))
                    }
                  >
                    Target tahunan
                  </option>
                  <option value="monthly">Realisasi bulanan</option>
                </select>
              </div>
              {form.mode === "monthly" && (
                <div className="field grid min-w-0 max-w-full gap-2">
                  <Label htmlFor="month">Bulan laporan *</Label>
                  <select
                    id="month"
                    className="filter-select w-full min-w-0 max-w-full truncate"
                    value={form.bulan}
                    onChange={(e) =>
                      setForm({ ...form, bulan: Number(e.target.value) })
                    }
                  >
                    {monthNames.map((m, i) => (
                      <option
                        key={m}
                        value={i + 1}
                        disabled={!q.data?.months[i].open || (user?.role === "OPERATOR_PUSKESMAS" && formReport?.verifikasiBulanan?.some((m: any) => m.bulan === i + 1 && m.isValidated))}
                      >
                        {m}
                        {!q.data?.months[i].open ? " · TUTUP" : ""}
                        {formReport?.verifikasiBulanan?.some((m: any) => m.bulan === i + 1 && m.isValidated) ? " · TERVERIFIKASI" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field grid min-w-0 max-w-full gap-2">
                <Label htmlFor="value">
                  {form.mode === "target"
                    ? "Target tahunan"
                    : "Realisasi bulan ini"}
                  {money ? " (Rp)" : ""}
                  {" *"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  required
                  min="0"
                  disabled={form.mode === "target" ? !!targetLocked : !!monthLocked}
                  max="100000000000000"
                  step={money ? "0.01" : "any"}
                  value={form.mode === "target" ? form.target : form.nilai}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [form.mode === "target" ? "target" : "nilai"]:
                        e.target.value,
                    })
                  }
                />
              </div>
              {(form.mode === "target" ? targetLocked : monthLocked) && (
                <p role="status" className="text-xs text-muted-foreground">Data sudah diverifikasi. Hubungi Admin Dinkes atau penanggung jawab indikator untuk koreksi.</p>
              )}
              {save.error && (
                <p role="alert" className="text-xs text-destructive">
                  {save.error.message}
                </p>
              )}
              <DialogFooter className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(null)}
                >
                  Batal
                </Button>
                <Button
                  disabled={
                    save.isPending ||
                    formOptions.isPending ||
                    !!formOptions.error ||
                    !form.faskesId ||
                    !form.entityId ||
                    (form.mode === "target" ? targetLocked : monthLocked) ||
                    (form.mode === "monthly" &&
                      !q.data?.months[form.bulan - 1]?.open)
                  }
                  className={existingRecord ? "border-amber-600 bg-amber-600 hover:bg-amber-700 text-white" : ""}
                >
                  {existingRecord && <AlertTriangle className="size-3.5 mr-1 shrink-0" />}
                  Simpan capaian
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus laporan tahunan?</DialogTitle>
            <DialogDescription>
              Target dan seluruh realisasi bulanan untuk {deleting?.label} di{" "}
              {deleting?.faskes.namaFaskes} akan dihapus. Tindakan dicatat dalam
              audit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Hapus laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDuplicate} onOpenChange={setConfirmDuplicate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5 shrink-0" />
              <DialogTitle>Konfirmasi Pembaruan Data Capaian</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-left space-y-2">
              <span className="block">
                {money ? "Sub kegiatan" : "Indikator"}{" "}
                <strong>&quot;{existingRecord?.label}&quot;</strong> sudah pernah diinputkan untuk{" "}
                <strong>
                  {existingRecord?.faskes?.namaFaskes ||
                    opts.data?.faskes.find((f: any) => f.id === form?.faskesId)?.namaFaskes ||
                    "fasilitas kesehatan ini"}
                </strong>{" "}
                pada tahun {filters.tahun}.
              </span>
              <span className="block text-xs text-muted-foreground">
                Menyimpan kembali akan memperbarui data capaian untuk {money ? "sub kegiatan" : "indikator"} ini.
              </span>
            </DialogDescription>
          </DialogHeader>
          {existingRecord && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between font-sans">
                <span className="text-muted-foreground">Target saat ini:</span>
                <span className="font-semibold text-foreground">{fmt(existingRecord.target)}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-muted-foreground">Total realisasi:</span>
                <span className="font-semibold text-foreground">{fmt(existingRecord.realisasi)}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-muted-foreground">Capaian:</span>
                <span className="font-semibold text-foreground">{number(existingRecord.persentase)}%</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDuplicate(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              disabled={save.isPending}
              onClick={() => {
                setConfirmDuplicate(false);
                save.mutate();
              }}
            >
              Ya, Perbarui Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={!!sheetRow} onOpenChange={(v) => !v && setSheetRow(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col gap-0 border-l bg-card"
        >
          {activeSheetRow && (
            <>
              <SheetHeader className="border-b p-5 pb-4 bg-muted/20">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider">
                    PANEL VERIFIKASI & DETAIL
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {shortFaskes(activeSheetRow.faskes?.namaFaskes)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Tahun {filters.tahun}
                  </Badge>
                </div>
                <SheetTitle className="text-base sm:text-lg font-bold leading-snug text-foreground">
                  {activeSheetRow.label}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
                  {activeSheetRow.indikator?.subKegiatan?.namaSubKegiatan ??
                    activeSheetRow.subKegiatan?.kegiatan?.namaKegiatan}
                </SheetDescription>
              </SheetHeader>

              {/* Ringkasan KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-5 border-b bg-muted/10 text-xs">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Target Tahunan</span>
                  <p className="font-mono font-bold text-sm text-foreground">{fmt(activeSheetRow.target)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Realisasi Kumulatif</span>
                  <p className="font-mono font-bold text-sm text-foreground">{fmt(activeSheetRow.realisasi)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Capaian</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-foreground">{number(activeSheetRow.persentase)}%</span>
                    <StatusBadge status={activeSheetRow.status} compact />
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Status Verifikasi</span>
                  <p className="font-semibold text-xs text-foreground">
                    {activeSheetRow.verifiedMonths ?? 0}/{activeSheetRow.submittedMonths ?? 0} Bulan
                  </p>
                </div>
              </div>

              {/* Daftar 12 Bulan */}
              <div className="flex-1 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pelaporan & Verifikasi Bulanan
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    {activeSheetRow.canVerify
                      ? "Verifikasi per bulan tanpa scroll horizontal"
                      : "Detail status per bulan"}
                  </span>
                </div>

                <div className="space-y-2">
                  {monthNames.map((m, i) => {
                    const monthly = activeSheetRow.verifikasiBulanan?.find((mb: any) => mb.bulan === i + 1);
                    const verified = !!monthly?.isValidated;
                    const isOpen = q.data?.months[i]?.open;
                    const hasValue = !!monthly;
                    const val = activeSheetRow[monthKeys[i]];

                    return (
                      <div
                        key={m}
                        data-testid={`sheet-month-${i + 1}`}
                        className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          verified
                            ? "bg-emerald-500/[0.04] border-emerald-200 dark:border-emerald-800/40"
                            : monthly
                            ? "bg-amber-500/[0.03] border-amber-200 dark:border-amber-800/40"
                            : "bg-card border-border/80"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground w-20">{m}</span>
                            <Badge
                              variant={isOpen ? "secondary" : "outline"}
                              className={`text-[10px] font-normal h-4 px-1.5 ${
                                isOpen ? "text-primary bg-primary/10" : "text-muted-foreground"
                              }`}
                            >
                              {isOpen ? "Buka" : "Tutup"}
                            </Badge>
                            {verified ? (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                                <CheckCircle2 className="size-3 shrink-0" />
                                Terverifikasi
                              </span>
                            ) : monthly ? (
                              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                                <Clock className="size-3 shrink-0" />
                                Menunggu Verifikasi
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Belum diisi
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                            <span className="text-muted-foreground">
                              Realisasi: <strong className="text-foreground font-mono">{hasValue ? fmt(val) : "—"}</strong>
                            </span>
                            {verified && (
                              <span className="text-[11px] text-muted-foreground/80">
                                · {monthly.legacyVerification
                                  ? "Verifikasi migrasi lama"
                                  : `Diverifikasi ${monthly.verifiedBy?.name ?? "Pemeriksa"}${
                                      monthly.verifiedAt ? ` (${new Date(monthly.verifiedAt).toLocaleDateString("id-ID")})` : ""
                                    }`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {!readOnly && user?.role === "OPERATOR_PUSKESMAS" && isOpen && !verified && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSheetRow(null);
                                open(activeSheetRow, i + 1);
                              }}
                            >
                              Input / Koreksi
                            </Button>
                          )}
                          {activeSheetRow.canVerify && monthly && (
                            <Button
                              variant={verified ? "secondary" : "default"}
                              size="sm"
                              className={`h-7 px-2.5 text-xs gap-1 font-medium ${
                                !verified ? "bg-[#064E3B] hover:bg-[#064E3B]/90 text-white" : ""
                              }`}
                              disabled={verify.isPending}
                              aria-label={`${verified ? "Batalkan" : "Verifikasi"} ${m} di panel`}
                              onClick={() =>
                                verify.mutate({
                                  row: activeSheetRow,
                                  bulan: i + 1,
                                  validated: !verified,
                                })
                              }
                            >
                              <CheckCheck className="size-3 shrink-0" />
                              {verified ? "Batalkan" : "Verifikasi"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <SheetFooter className="border-t p-4 bg-muted/20 flex flex-row items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  * Verifikasi bulanan mengunci data dari perubahan faskes.
                </span>
                <Button variant="outline" size="sm" onClick={() => setSheetRow(null)}>
                  Tutup
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
