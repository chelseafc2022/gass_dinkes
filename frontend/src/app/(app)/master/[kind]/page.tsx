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
  const columns: ColumnDef<any, any>[] = [
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
        <Button onClick={() => edit(null)} size="sm">
          <Plus className="size-4" />
          Tambah data
        </Button>
      </div>
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
