"use client";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Download,
  LockKeyhole,
  Pencil,
  CheckCheck,
  Search,
  Trash2,
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
import { api, write, queryString, number, rupiah, exportCsv } from "@/lib/api";
import { useDebounced } from "@/hooks/use-debounced";
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
            : "Klik angka bulanan untuk mengisi atau memperbarui realisasi."}
        </span>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table className="min-w-[1800px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 z-10 bg-card min-w-72 px-4 text-xs">
                    {money
                      ? "Sub kegiatan & kegiatan"
                      : "Indikator & sub kegiatan"}
                  </TableHead>
                  <TableHead className="min-w-36 text-xs">
                    Target {money ? "pagu" : "kinerja"}
                  </TableHead>
                  {monthNames.map((m, i) => (
                    <TableHead key={m} className="min-w-28 text-xs">
                      <div>{m.slice(0, 3)}</div>
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] mt-1 ${q.data.months[i].open ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {!q.data.months[i].open && (
                          <LockKeyhole className="size-2.5" />
                        )}
                        {q.data.months[i].open
                          ? "BUKA"
                          : readOnly
                            ? "BACA"
                            : "TUTUP"}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-36 text-xs">Realisasi</TableHead>
                  <TableHead className="min-w-44 text-xs">Capaian</TableHead>
                  <TableHead className="text-xs min-w-28">Verifikasi</TableHead>
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
                    <TableRow key={r.id}>
                      <TableCell className="sticky left-0 z-10 bg-card max-w-80 px-4 py-5 whitespace-normal">
                        <p className="text-xs font-semibold leading-5">
                          {r.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {r.indikator?.subKegiatan.namaSubKegiatan ??
                            r.subKegiatan.kegiatan.namaKegiatan}
                        </p>
                        <Badge variant="outline" className="text-[9px] mt-2">
                          {r.faskes.namaFaskes}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          disabled={
                            readOnly ||
                            (user?.role === "OPERATOR_PUSKESMAS" &&
                              q.data.months.some((p: any) => !p.open))
                          }
                          onClick={() => open(r)}
                          className="flex items-center gap-2 text-xs disabled:cursor-default"
                        >
                          {fmt(r.target)}
                          {!readOnly && (
                            <Pencil className="size-3 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      {monthKeys.map((key, i) => (
                        <TableCell key={key}>
                          <button
                            className="text-xs text-left w-full rounded-md border border-transparent px-2 py-2 hover:border-primary/30 hover:bg-primary/5 disabled:text-muted-foreground disabled:hover:bg-transparent disabled:hover:border-transparent"
                            aria-label={`Edit ${monthNames[i]} ${r.label}`}
                            disabled={readOnly || !q.data.months[i].open}
                            onClick={() => open(r, i + 1)}
                          >
                            {fmt(r[key])}
                          </button>
                        </TableCell>
                      ))}
                      <TableCell className="text-xs font-semibold">
                        {fmt(r.realisasi)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold mb-2">
                          {number(r.persentase)}%
                        </p>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
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
                              disabled={verify.isPending}
                              onClick={() => verify.mutate(r)}
                            >
                              <CheckCheck className="size-3" />
                              {r.isValidated ? "Terverifikasi" : "Verifikasi"}
                            </Button>
                          ) : (
                            <Badge variant="outline">
                              {r.isValidated
                                ? "Terverifikasi"
                                : "Belum diperiksa"}
                            </Badge>
                          )}
                          {user?.role === "ADMIN_DINKES" && (
                            <Button
                              variant="ghost"
                              size="icon"
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
          <p className="text-[10px] text-muted-foreground mt-3">
            Geser tabel ke kanan untuk melihat seluruh bulan. Perubahan
            realisasi membatalkan verifikasi sebelumnya.
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
