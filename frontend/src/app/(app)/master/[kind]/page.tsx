"use client";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  RefreshCw,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { masterConfig, optionLabel } from "@/components/gass/master-config";
import { DataTable } from "@/components/gass/data-table";
import { ErrorState, Loading } from "@/components/gass/shared";
import { useAuth } from "@/components/gass/providers";
import { useDebounced } from "@/hooks/use-debounced";
import { api, queryString, write } from "@/lib/api";
export default function Master({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = use(params);
  const c = masterConfig[kind];
  const client = useQueryClient(),
    { user } = useAuth();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<any>(null),
    [form, setForm] = useState<any>({}),
    [deleting, setDeleting] = useState<any>(null);
  const debounced = useDebounced(search);
  const q = useQuery({
    queryKey: ["master", kind, debounced, page],
    queryFn: () =>
      api(`/master/${kind}?${queryString({ search: debounced, page })}`),
    enabled: !!c && !!user?.permissions.includes(`master_${kind}`),
  });
  const opts = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["master"] });
    client.invalidateQueries({ queryKey: ["options"] });
    client.invalidateQueries({ queryKey: ["dashboard"] });
    client.invalidateQueries({ queryKey: ["capaian"] });
  };
  const save = useMutation({
    mutationFn: () =>
      write(
        `/master/${kind}${editing?.id ? `/${editing.id}` : ""}`,
        form,
        editing?.id ? "PUT" : "POST",
      ),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Data berhasil disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () =>
      api(`/master/${kind}/${deleting.id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.success("Data berhasil dihapus.");
    },
    onError: (e) => toast.error(e.message),
  });
  const syncBidang = useMutation({
    mutationFn: () => write("/master/bidang/sync-simpeg", {}, "POST"),
    onSuccess: (data: any) => {
      invalidate();
      toast.success(
        data?.message || "Data bidang berhasil disinkronkan dari SIMPEG.",
      );
    },
    onError: (e: any) =>
      toast.error(e.message || "Gagal sinkronisasi data dari SIMPEG."),
  });
  const syncKecamatan = useMutation({
    mutationFn: () => write("/master/kecamatan/sync-egov", {}, "POST"),
    onSuccess: (data: any) => {
      invalidate();
      toast.success(
        data?.message || "Data kecamatan berhasil disinkronkan dari E-Gov.",
      );
    },
    onError: (e: any) =>
      toast.error(e.message || "Gagal sinkronisasi data dari E-Gov."),
  });
  const syncFaskes = useMutation({
    mutationFn: () => write("/master/faskes/sync-simpeg", {}, "POST"),
    onSuccess: (data: any) => {
      invalidate();
      toast.success(
        data?.message || "Data faskes berhasil disinkronkan dari SIMPEG.",
      );
    },
    onError: (e: any) =>
      toast.error(e.message || "Gagal sinkronisasi data dari SIMPEG."),
  });

  if (!c) return <p>Master tidak ditemukan.</p>;
  const edit = (row: any) => {
    setForm(
      Object.fromEntries(
        c.fields.map((f) => [
          f.key,
          row?.[f.key] ??
            (f.key === "bidangIds"
              ? (row?.bidang?.map((b: any) => b.bidangId) ?? [])
              : (f.default ??
                (f.type === "boolean"
                  ? false
                  : f.type === "multi"
                    ? []
                    : null))),
        ]),
      ),
    );
    setEditing(row || {});
  };

  const columns: ColumnDef<any, any>[] =
    kind === "bidang"
      ? [
          {
            accessorKey: "kodeBidang",
            header: "Kode Bidang",
            cell: ({ getValue }) => (
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                {String(getValue() || "—")}
              </Badge>
            ),
          },
          {
            accessorKey: "namaBidang",
            header: "Nama Bidang / Penanggung Jawab",
            cell: ({ row }) => (
              <div className="font-medium text-foreground">
                {row.original.namaBidang}
              </div>
            ),
          },
          {
            accessorKey: "kepalaBidang",
            header: "Kepala Bidang / Pejabat SIMPEG",
            cell: ({ getValue }) => (
              <div className="text-xs text-muted-foreground font-medium">
                {String(getValue() || "—")}
              </div>
            ),
          },
          {
            id: "actions",
            header: "Tindakan",
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${row.original[c.name]}`}
                  onClick={() => edit(row.original)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {user?.role === "ADMIN_DINKES" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${row.original[c.name]}`}
                    onClick={() => setDeleting(row.original)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : kind === "kecamatan"
      ? [
          {
            accessorKey: "kodeKecamatan",
            header: "Kode Wilayah",
            cell: ({ getValue }) => (
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                {String(getValue() || "—")}
              </Badge>
            ),
          },
          {
            accessorKey: "namaKecamatan",
            header: "Nama Kecamatan",
            cell: ({ row }) => (
              <div className="font-semibold text-foreground tracking-wide">
                {row.original.namaKecamatan}
              </div>
            ),
          },
          {
            id: "actions",
            header: "Tindakan",
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${row.original[c.name]}`}
                  onClick={() => edit(row.original)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {user?.role === "ADMIN_DINKES" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${row.original[c.name]}`}
                    onClick={() => setDeleting(row.original)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : kind === "faskes"
      ? [
          {
            accessorKey: "namaFaskes",
            header: "Nama Fasilitas Kesehatan",
            cell: ({ row }) => (
              <div>
                <div className="font-semibold text-foreground">
                  {row.original.namaFaskes}
                </div>
                {row.original.alamat && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {row.original.alamat}
                  </p>
                )}
              </div>
            ),
          },
          {
            accessorKey: "jenisFaskes",
            header: "Jenis Faskes",
            cell: ({ getValue }) => {
              const val = String(getValue() || "PUSKESMAS");
              return (
                <Badge
                  variant="outline"
                  className={
                    val === "RUMAH_SAKIT"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  }
                >
                  {val === "RUMAH_SAKIT"
                    ? "Rumah Sakit"
                    : val === "PUSKESMAS"
                      ? "Puskesmas"
                      : val}
                </Badge>
              );
            },
          },
          {
            accessorKey: "kecamatan",
            header: "Wilayah Kecamatan",
            cell: ({ row }) => {
              const kecName =
                row.original.kecamatan?.namaKecamatan ||
                opts.data?.kecamatan?.find(
                  (k: any) => k.id === row.original.kecamatanId,
                )?.namaKecamatan ||
                "—";
              return (
                <div className="text-xs font-medium text-foreground">
                  Kec. {kecName}
                </div>
              );
            },
          },
          {
            id: "actions",
            header: "Tindakan",
            cell: ({ row }) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${row.original[c.name]}`}
                  onClick={() => edit(row.original)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {user?.role === "ADMIN_DINKES" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${row.original[c.name]}`}
                    onClick={() => setDeleting(row.original)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : [
          {
            accessorKey: c.name,
            header: c.title,
            cell: ({ row }) => (
              <div>
                <span className="font-medium">{row.original[c.name]}</span>
                {row.original.tahun && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tahun anggaran {row.original.tahun}
                  </p>
                )}
              </div>
            ),
          },
          ...c.fields
            .filter(
              (f) =>
                f.key !== c.name &&
                f.type !== "textarea" &&
                f.type !== "multi" &&
                !f.key.endsWith("Id") &&
                f.key !== "tahun" &&
                !f.key.startsWith("threshold"),
            )
            .slice(0, 3)
            .map((f) => ({
              accessorKey: f.key,
              header: f.label,
              cell: ({ getValue }: any) =>
                typeof getValue() === "boolean" ? (
                  <Badge variant="outline">
                    {getValue() ? "Diizinkan" : "Tidak"}
                  </Badge>
                ) : (
                  String(getValue() ?? "—")
                ),
            })),
          {
            id: "actions",
            header: "Tindakan",
            cell: ({ row }) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${row.original[c.name]}`}
                  onClick={() => edit(row.original)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                {user?.role === "ADMIN_DINKES" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus ${row.original[c.name]}`}
                    onClick={() => setDeleting(row.original)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ];

  return (
    <>
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <p className="eyebrow mb-2">DATA MASTER</p>
          <h1 className="page-heading">{c.title}</h1>
          <p className="page-description">{c.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {kind === "bidang" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncBidang.mutate()}
              disabled={syncBidang.isPending}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${
                  syncBidang.isPending ? "animate-spin" : ""
                }`}
              />
              <span>Sinkronkan dari SIMPEG</span>
            </Button>
          )}
          {kind === "kecamatan" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncKecamatan.mutate()}
              disabled={syncKecamatan.isPending}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${
                  syncKecamatan.isPending ? "animate-spin" : ""
                }`}
              />
              <span>Sinkronkan dari E-Gov</span>
            </Button>
          )}
          {kind === "faskes" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFaskes.mutate()}
              disabled={syncFaskes.isPending}
              className="gap-1.5"
            >
              <RefreshCw
                className={`size-3.5 ${
                  syncFaskes.isPending ? "animate-spin" : ""
                }`}
              />
              <span>Sinkronkan dari SIMPEG</span>
            </Button>
          )}
          <Button onClick={() => edit(null)} size="sm">
            <Plus className="size-4" />
            Tambah data
          </Button>
        </div>
      </div>

      {kind === "bidang" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Database className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Terintegrasi Langsung dengan SIMPEG Konawe Selatan
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Data Bidang dan Sekretariat otomatis diambil dari struktur
                jabatan Dinas Kesehatan di database SIMPEG beserta data pejabat
                terkini.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncBidang.mutate()}
            disabled={syncBidang.isPending}
            className="shrink-0 h-8 gap-1.5 text-xs bg-background"
          >
            <RefreshCw
              className={`size-3.5 ${
                syncBidang.isPending ? "animate-spin" : ""
              }`}
            />
            <span>Perbarui dari SIMPEG</span>
          </Button>
        </div>
      )}

      {/* {kind === "kecamatan" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Database className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Terintegrasi Langsung dengan E-Gov Konawe Selatan
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Data 25 wilayah kecamatan se-Kabupaten Konawe Selatan diambil langsung dari database E-Gov (tabel master_kecamatan).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncKecamatan.mutate()}
            disabled={syncKecamatan.isPending}
            className="shrink-0 h-8 gap-1.5 text-xs bg-background"
          >
            <RefreshCw
              className={`size-3.5 ${
                syncKecamatan.isPending ? "animate-spin" : ""
              }`}
            />
            <span>Perbarui dari E-Gov</span>
          </Button>
        </div>
      )} */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Cari data"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Cari ${c.title.toLowerCase()}…`}
            className="pl-9 bg-card"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {q.data?.total ?? 0} data
        </span>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable data={q.data?.data ?? []} columns={columns} />
      )}
      <div className="flex justify-end items-center gap-3 mt-4 text-xs text-muted-foreground">
        <span>
          Halaman {page} dari {Math.max(1, q.data?.totalPages ?? 1)}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman sebelumnya"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman berikutnya"
          disabled={page >= (q.data?.totalPages ?? 1)}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <Dialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit" : "Tambah"} {c.title.toLowerCase()}
            </DialogTitle>
            <DialogDescription>
              Lengkapi data berikut. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-4"
          >
            {c.fields.map((f) => (
              <div className="field" key={f.key}>
                <Label htmlFor={f.key}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.type === "boolean" ? (
                  <Switch
                    id={f.key}
                    checked={!!form[f.key]}
                    onCheckedChange={(v) => setForm({ ...form, [f.key]: v })}
                  />
                ) : f.type === "multi" ? (
                  <div className="grid gap-3 rounded-lg border p-3">
                    {opts.data?.[f.source!]?.map((o: any) => (
                      <label
                        key={o.id}
                        className="flex gap-2 items-center text-xs"
                      >
                        <Checkbox
                          checked={(form[f.key] || []).includes(o.id)}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              [f.key]: v
                                ? [...(form[f.key] || []), o.id]
                                : form[f.key].filter(
                                    (id: string) => id !== o.id,
                                  ),
                            })
                          }
                        />
                        {optionLabel(o)}
                      </label>
                    ))}
                    {!opts.data?.[f.source!]?.length && (
                      <p className="text-xs text-muted-foreground">
                        Tambahkan data {f.source} terlebih dahulu.
                      </p>
                    )}
                  </div>
                ) : f.type === "select" ? (
                  <select
                    id={f.key}
                    className="filter-select w-full"
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value || null })
                    }
                  >
                    <option value="">Pilih {f.label.toLowerCase()}</option>
                    {f.options
                      ? f.options.map((o) => (
                          <option key={o} value={o}>
                            {o.replaceAll("_", " ")}
                          </option>
                        ))
                      : opts.data?.[f.source!]?.map((o: any) => (
                          <option key={o.id} value={o.id}>
                            {optionLabel(o)}
                          </option>
                        ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : "text"}
                    step="any"
                    min={f.type === "number" ? 0 : undefined}
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]:
                          f.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </div>
            ))}
            {save.error && (
              <p className="text-xs text-destructive" role="alert">
                {save.error.message}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Batal
              </Button>
              <Button disabled={save.isPending}>
                {save.isPending && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                Simpan data
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus data ini?</DialogTitle>
            <DialogDescription>
              {deleting?.[c.name]} akan dihapus. Data yang masih digunakan oleh
              laporan atau master lain tidak dapat dihapus.
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
              Hapus data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
