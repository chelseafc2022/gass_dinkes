"use client";
import { use, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Download,
  LockKeyhole,
  Pencil,
  CheckCheck,
  Search,
  Trash2,
  CalendarDays,
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

function InlineCell({
  value,
  disabled,
  onSave,
  className = "",
  placeholder = "0",
  max = 999999999,
}: {
  value: number;
  disabled?: boolean;
  onSave: (val: number) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  max?: number;
}) {
  const [val, setVal] = useState<string>(String(value ?? 0));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setVal(String(value ?? 0));
  }, [value]);

  const commit = async () => {
    const parsed = Number(val);
    const num = isNaN(parsed) ? 0 : Math.max(0, parsed);
    if (num === (value ?? 0)) return;
    try {
      setSaving(true);
      await onSave(num);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 900);
    } catch {
      setVal(String(value ?? 0));
    } finally {
      setSaving(false);
    }
  };

  if (disabled) {
    return (
      <span className="block text-center text-xs font-mono font-medium text-muted-foreground select-none">
        {value ?? 0}
      </span>
    );
  }

  return (
    <input
      type="number"
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
    [form, setForm] = useState<any>(null),
    [deleting, setDeleting] = useState<any>(null);
  const debounced = useDebounced(search);
  const q = useQuery({
    queryKey: ["capaian", kind, filters, debounced],
    queryFn: () =>
      api(`/capaian/${kind}?${queryString({ ...filters, search: debounced })}`),
    enabled: valid && !!user?.permissions.includes(`capaian_${kind}`),
  });
  const opts = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const changed = () => {
    client.invalidateQueries({ queryKey: ["capaian"] });
    client.invalidateQueries({ queryKey: ["dashboard"] });
  };
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
      setForm(null);
      toast.success("Capaian berhasil disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  const verify = useMutation({
    mutationFn: (r: any) =>
      write(
        `/capaian/${kind}/${r.id}/verify`,
        { validated: !r.isValidated },
        "POST",
      ),
    onSuccess: () => {
      changed();
      toast.success("Status verifikasi diperbarui.");
    },
    onError: (e) => toast.error(e.message),
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
  const open = (r?: any, month?: number) =>
    setForm({
      entityId: r?.indikatorId ?? r?.subKegiatanId ?? "",
      faskesId: r?.faskesId ?? user?.faskesId ?? filters.faskesId,
      mode: month ? "monthly" : "target",
      target: r?.target ?? 0,
      bulan: month ?? 1,
      nilai: month ? r[monthKeys[month - 1]] : 0,
      existing: !!r,
      label: r?.label,
    });
  return (
    <>
      <div className="flex justify-between items-start gap-4 mb-6">
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
      <GlobalFilters value={filters} onChange={setFilters} period={false} />
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
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Cari laporan"
            className="pl-9 bg-card"
            placeholder="Cari indikator atau fasilitas kesehatan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <div className="rounded-xl border bg-card overflow-hidden w-full">
            <Table className="w-full table-fixed text-xs">
              <TableHeader>
                <TableRow className="bg-muted/50 border-b">
                  <TableHead className="w-[21%] px-3 py-2 text-xs text-left">
                    {money
                      ? "Sub kegiatan & kegiatan"
                      : "Indikator & sub kegiatan"}
                  </TableHead>
                  <TableHead className="w-[6%] px-0.5 py-2 text-center text-xs bg-sky-500/10 dark:bg-sky-500/15 text-sky-950 dark:text-sky-200 border-x border-sky-200/50 dark:border-sky-800/40 font-semibold">
                    Target
                  </TableHead>
                  {monthNames.map((m, i) => (
                    <TableHead key={m} className="w-[4.2%] px-0.5 py-1.5 text-center text-xs">
                      <div className="font-semibold text-[11px] leading-none">{m.slice(0, 3)}</div>
                      <span
                        className={`inline-flex items-center justify-center text-[8px] font-medium mt-0.5 leading-none ${
                          q.data.months[i].open ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {q.data.months[i].open ? "BUKA" : "TUTUP"}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-[6.2%] px-0.5 py-2 text-center text-xs bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 border-x border-emerald-200/50 dark:border-emerald-800/40 font-semibold">
                    Realisasi
                  </TableHead>
                  <TableHead className="w-[10.4%] px-1 py-2 text-center text-xs font-semibold">
                    Threshold & %
                  </TableHead>
                  <TableHead className="w-[6%] px-1 py-2 text-center text-xs">
                    Verif
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={17}
                      className="h-52 text-center text-muted-foreground"
                    >
                      Belum ada laporan. Pilih fasilitas kesehatan dan mulai
                      input capaian.
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data.data.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-muted/20">
                      <TableCell className="px-3 py-2 align-middle">
                        <p className="text-xs font-semibold leading-snug line-clamp-2" title={r.label}>
                          {r.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={r.indikator?.subKegiatan.namaSubKegiatan ?? r.subKegiatan.kegiatan.namaKegiatan}>
                          {r.indikator?.subKegiatan.namaSubKegiatan ??
                            r.subKegiatan.kegiatan.namaKegiatan}
                        </p>
                        <Badge variant="outline" className="text-[9px] mt-1 px-1.5 py-0 h-4 font-normal" title={r.faskes.namaFaskes}>
                          {shortFaskes(r.faskes.namaFaskes)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-0.5 py-2 text-center align-middle bg-sky-500/[0.035] dark:bg-sky-500/[0.06] border-x border-sky-100/60 dark:border-sky-900/30">
                        {money ? (
                          <button
                            disabled={
                              readOnly ||
                              (user?.role === "OPERATOR_PUSKESMAS" &&
                                q.data.months.some((p: any) => !p.open))
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
                                q.data.months.some((p: any) => !p.open))
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
                      {monthKeys.map((key, i) => (
                        <TableCell key={key} className="px-0.5 py-2 text-center align-middle">
                          {money ? (
                            <button
                              className="text-xs text-center w-full rounded px-1 py-1 hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent"
                              aria-label={`Edit ${monthNames[i]} ${r.label}`}
                              disabled={readOnly || !q.data.months[i].open}
                              onClick={() => open(r, i + 1)}
                            >
                              {fmt(r[key])}
                            </button>
                          ) : (
                            <InlineCell
                              value={r[key]}
                              disabled={readOnly || !q.data.months[i].open}
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
                        </TableCell>
                      ))}
                      <TableCell className="px-0.5 py-2 text-center align-middle font-mono font-bold text-xs bg-emerald-500/[0.035] dark:bg-emerald-500/[0.06] border-x border-emerald-100/60 dark:border-emerald-900/30 text-emerald-950 dark:text-emerald-100">
                        {fmt(r.realisasi)}
                      </TableCell>
                      <TableCell className="px-1 py-1.5 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="font-mono text-xs font-bold leading-tight">
                            {number(r.persentase)}%
                          </span>
                          <StatusBadge status={r.status} compact />
                        </div>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center align-middle">
                        <div className="flex gap-1 items-center justify-center">
                          {["ADMIN_DINKES", "AKUN_BIDANG"].includes(
                            user?.role || "",
                          ) ? (
                            <Button
                              title={
                                r.isValidated
                                    ? "Batalkan verifikasi"
                                  : "Verifikasi laporan"
                              }
                              variant={r.isValidated ? "secondary" : "outline"}
                              size="sm"
                              className="h-6 px-1.5 text-[10px]"
                              disabled={verify.isPending}
                              onClick={() => verify.mutate(r)}
                            >
                              <CheckCheck className="size-3" />
                              <span className="hidden xl:inline">{r.isValidated ? "Batal" : "Verif"}</span>
                            </Button>
                          ) : (
                            <Badge variant={r.isValidated ? "default" : "outline"} className="text-[9px] px-1 py-0 h-4">
                              {r.isValidated ? "Valid" : "Belum"}
                            </Badge>
                          )}
                          {user?.role === "ADMIN_DINKES" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              aria-label="Hapus laporan"
                              onClick={() => setDeleting(r)}
                            >
                              <Trash2 className="size-3 text-destructive" />
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
            * Angka realisasi otomatis disimpan saat berpindah sel atau menekan tombol Enter. Perubahan realisasi membatalkan status verifikasi.
          </p>
        </>
      )}
      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form?.existing ? "Perbarui" : "Input"} capaian {kind}
            </DialogTitle>
            <DialogDescription>
              {form?.label ||
                `Laporan tahun ${filters.tahun}. Pilih target atau realisasi bulanan.`}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              <div className="field">
                <Label htmlFor="facility">Fasilitas kesehatan</Label>
                <select
                  id="facility"
                  required
                  className="filter-select"
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
              <div className="field">
                <Label htmlFor="entity">
                  {money ? "Sub kegiatan" : "Indikator"}
                </Label>
                <select
                  id="entity"
                  required
                  className="filter-select max-w-full"
                  disabled={form.existing}
                  value={form.entityId}
                  onChange={(e) =>
                    setForm({ ...form, entityId: e.target.value })
                  }
                >
                  <option value="">
                    Pilih {money ? "sub kegiatan" : "indikator"}
                  </option>
                  {q.data?.available.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.namaIndikator ?? i.namaSubKegiatan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="mode">Jenis pengisian</Label>
                <select
                  id="mode"
                  className="filter-select"
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option
                    value="target"
                    disabled={
                      user?.role === "OPERATOR_PUSKESMAS" &&
                      q.data?.months.some((p: any) => !p.open)
                    }
                  >
                    Target tahunan
                  </option>
                  <option value="monthly">Realisasi bulanan</option>
                </select>
              </div>
              {form.mode === "monthly" && (
                <div className="field">
                  <Label htmlFor="month">Bulan laporan</Label>
                  <select
                    id="month"
                    className="filter-select"
                    value={form.bulan}
                    onChange={(e) =>
                      setForm({ ...form, bulan: Number(e.target.value) })
                    }
                  >
                    {monthNames.map((m, i) => (
                      <option
                        key={m}
                        value={i + 1}
                        disabled={!q.data?.months[i].open}
                      >
                        {m}
                        {!q.data?.months[i].open ? " · TUTUP" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <Label htmlFor="value">
                  {form.mode === "target"
                    ? "Target tahunan"
                    : "Realisasi bulan ini"}
                  {money ? " (Rp)" : ""}
                </Label>
                <Input
                  id="value"
                  type="number"
                  required
                  min="0"
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
              {save.error && (
                <p role="alert" className="text-xs text-destructive">
                  {save.error.message}
                </p>
              )}
              <DialogFooter>
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
                    (form.mode === "monthly" &&
                      !q.data?.months[form.bulan - 1]?.open)
                  }
                >
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
    </>
  );
}
