"use client";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/gass/data-table";
import { ErrorState, Loading } from "@/components/gass/shared";
import { useAuth } from "@/components/gass/providers";
import {
  navigation,
  roleNames,
  monthNames,
} from "@/components/gass/navigation";
import { useDebounced } from "@/hooks/use-debounced";
import { api, write } from "@/lib/api";
function Settings() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => api("/admin/settings"),
  });
  const [draft, setDraft] = useState<any>(null),
    [override, setOverride] = useState<any>(null);
  const save = useMutation({
    mutationFn: () => {
      const s = draft || q.data.settings;
      return write("/admin/settings", {
        batasTanggalInput: s.batasTanggalInput,
        isOtomatisAktif: s.isOtomatisAktif,
        mulaiOtomatisPeriode: s.mulaiOtomatisPeriode,
      });
    },
    onSuccess: () => {
      client.invalidateQueries();
      setDraft(null);
      toast.success("Pengaturan disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  const saveOverride = useMutation({
    mutationFn: () =>
      write("/admin/overrides", {
        ...override,
        batasKhusus: override.batasKhusus
          ? `${override.batasKhusus}:00+08:00`
          : null,
      }),
    onSuccess: () => {
      client.invalidateQueries();
      setOverride(null);
      toast.success("Override disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/overrides/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries();
      toast.success("Override dihapus. Aturan global kembali berlaku.");
    },
    onError: (e) => toast.error(e.message),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const s = draft || q.data.settings;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aturan periode input</CardTitle>
          <CardDescription>
            Batas waktu berlaku bagi operator faskes. Admin Dinkes dan bidang
            dapat melakukan koreksi kapan saja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex justify-between items-center rounded-lg border bg-muted/30 p-4">
              <div>
                <Label htmlFor="auto">Penguncian otomatis</Label>
                <p className="text-xs text-muted-foreground mt-2">
                  {s.isOtomatisAktif
                    ? "Laporan mengikuti deadline bulanan."
                    : "Mode pra-launching: bulan lampau tetap terbuka untuk pengisian historis."}
                </p>
              </div>
              <Switch
                id="auto"
                checked={s.isOtomatisAktif}
                onCheckedChange={(v) => setDraft({ ...s, isOtomatisAktif: v })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="field">
                <Label htmlFor="cutoff">Batas tanggal bulan berikutnya</Label>
                <Input
                  id="cutoff"
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={s.batasTanggalInput}
                  onChange={(e) =>
                    setDraft({
                      ...s,
                      batasTanggalInput: Number(e.target.value),
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Sampai pukul 23.59 WITA. Gunakan override untuk tanggal
                  khusus.
                </p>
              </div>
              <div className="field">
                <Label htmlFor="start">
                  Mulai berlaku pada periode (opsional)
                </Label>
                <Input
                  id="start"
                  type="month"
                  value={s.mulaiOtomatisPeriode || ""}
                  onChange={(e) =>
                    setDraft({
                      ...s,
                      mulaiOtomatisPeriode: e.target.value || null,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Periode sebelum bulan ini tetap terbuka.
                </p>
              </div>
            </div>
            <Button disabled={save.isPending}>
              <Save className="size-4" />
              Simpan pengaturan
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Pengecualian periode</h2>
        <Button
          size="sm"
          onClick={() =>
            setOverride({
              tahun: new Date().getFullYear(),
              bulan: new Date().getMonth() + 1,
              statusOverride: "BUKA",
              batasKhusus: "",
              keterangan: "",
            })
          }
        >
          <Plus className="size-4" />
          Tambah override
        </Button>
      </div>
      <DataTable
        data={q.data.overrides}
        columns={[
          { accessorKey: "tahun", header: "Tahun" },
          {
            accessorKey: "bulan",
            header: "Bulan",
            cell: ({ getValue }) => monthNames[Number(getValue()) - 1],
          },
          {
            accessorKey: "statusOverride",
            header: "Status",
            cell: ({ getValue }) => (
              <Badge variant="outline">{String(getValue())}</Badge>
            ),
          },
          {
            accessorKey: "batasKhusus",
            header: "Deadline khusus",
            cell: ({ getValue }) =>
              getValue()
                ? new Date(String(getValue())).toLocaleString("id-ID", {
                    timeZone: "Asia/Makassar",
                  })
                : "Tanpa batas khusus",
          },
          { accessorKey: "keterangan", header: "Keterangan" },
          {
            id: "actions",
            header: "Tindakan",
            cell: ({ row }) => (
              <Button
                aria-label="Hapus override"
                variant="ghost"
                size="icon"
                disabled={remove.isPending}
                onClick={() => remove.mutate(row.original.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            ),
          },
        ]}
      />
      <Dialog open={!!override} onOpenChange={(v) => !v && setOverride(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override periode</DialogTitle>
            <DialogDescription>
              Pengecualian ini didahulukan dari aturan otomatis dan mode
              pra-launching.
            </DialogDescription>
          </DialogHeader>
          {override && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveOverride.mutate();
              }}
            >
              <div className="field">
                <Label htmlFor="year">Tahun</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2100"
                  required
                  value={override.tahun}
                  onChange={(e) =>
                    setOverride({ ...override, tahun: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <Label htmlFor="month">Bulan</Label>
                <select
                  id="month"
                  className="filter-select"
                  value={override.bulan}
                  onChange={(e) =>
                    setOverride({ ...override, bulan: Number(e.target.value) })
                  }
                >
                  {monthNames.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="filter-select"
                  value={override.statusOverride}
                  onChange={(e) =>
                    setOverride({ ...override, statusOverride: e.target.value })
                  }
                >
                  <option>BUKA</option>
                  <option>TUTUP</option>
                </select>
              </div>
              <div className="field">
                <Label htmlFor="deadline">
                  Deadline khusus (WITA, opsional)
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={override.batasKhusus}
                  onChange={(e) =>
                    setOverride({ ...override, batasKhusus: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <Label htmlFor="note">Alasan / keterangan</Label>
                <Input
                  id="note"
                  required
                  value={override.keterangan}
                  onChange={(e) =>
                    setOverride({ ...override, keterangan: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button disabled={saveOverride.isPending}>
                  Simpan override
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Permissions() {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["permissions"],
    queryFn: () => api("/admin/permissions"),
  });
  const save = useMutation({
    mutationFn: (b: any) => write("/admin/permissions", b),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["permissions"] });
      client.invalidateQueries({ queryKey: ["me"] });
      toast.success("Otoritas diperbarui.");
    },
    onError: (e) => toast.error(e.message),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  return (
    <>
      <div className="rounded-lg bg-primary/5 border border-primary/15 p-4 flex gap-3 mb-5">
        <ShieldCheck className="size-5 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground leading-6">
          Perubahan langsung disimpan. Akses master bagi operator faskes, mode
          baca Kepala Dinas, dan kewenangan bidang tetap mengikuti batas
          keamanan peran.
        </p>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5">Menu / fitur</TableHead>
              {q.data.roles.map((r: string) => (
                <TableHead className="text-center text-xs" key={r}>
                  {roleNames[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.menus.map((m: string) => (
              <TableRow key={m}>
                <TableCell className="px-5 py-4 text-xs font-medium">
                  {navigation.find((n) => n.key === m)?.title ?? m}
                </TableCell>
                {q.data.roles.map((r: string) => {
                  const p = q.data.data.find(
                    (v: any) => v.role === r && v.menuKey === m,
                  );
                  return (
                    <TableCell className="text-center" key={r}>
                      <Checkbox
                        aria-label={`${roleNames[r]} ${m}`}
                        checked={p.canAccess}
                        disabled={p.locked || save.isPending}
                        onCheckedChange={(v) =>
                          save.mutate({ role: r, menuKey: m, canAccess: !!v })
                        }
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
function Users() {
  const client = useQueryClient(),
    { user } = useAuth();
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => api("/admin/users"),
  });
  const opts = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const [editing, setEditing] = useState<any>(null),
    [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const lookup = useQuery({
    queryKey: ["pegawai", debounced],
    queryFn: () => api(`/admin/pegawai?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 3 && editing !== null && !editing.id,
    retry: false,
  });
  const save = useMutation({
    mutationFn: () =>
      write(
        `/admin/users${editing.id ? `/${editing.id}` : ""}`,
        {
          nip: editing.nip,
          role: editing.role,
          faskesId: editing.faskesId || null,
          bidangId: editing.bidangId || null,
          email: editing.email || null,
          isActive: editing.isActive,
        },
        editing.id ? "PUT" : "POST",
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["users"] });
      if (editing.id === user?.id)
        client.invalidateQueries({ queryKey: ["me"] });
      setEditing(null);
      toast.success("Akses pengguna disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => {
            setSearch("");
            setEditing({
              nip: "",
              name: "",
              role: "OPERATOR_PUSKESMAS",
              faskesId: "",
              bidangId: "",
              email: "",
              isActive: true,
            });
          }}
        >
          <Plus className="size-4" />
          Tetapkan akses pegawai
        </Button>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable
          data={q.data ?? []}
          columns={[
            {
              accessorKey: "name",
              header: "Nama pegawai",
              cell: ({ row }) => (
                <div>
                  <p className="font-medium">{row.original.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {row.original.nip}
                  </p>
                </div>
              ),
            },
            {
              accessorKey: "role",
              header: "Peran",
              cell: ({ getValue }) => roleNames[String(getValue())],
            },
            {
              id: "scope",
              header: "Penugasan",
              cell: ({ row }) =>
                row.original.faskes?.namaFaskes ??
                row.original.bidang?.namaBidang ??
                "Dinas Kesehatan",
            },
            {
              accessorKey: "isActive",
              header: "Status",
              cell: ({ getValue }) => (
                <Badge variant="outline">
                  {getValue() ? "Aktif" : "Nonaktif"}
                </Badge>
              ),
            },
            {
              id: "actions",
              header: "Tindakan",
              cell: ({ row }) => (
                <Button
                  aria-label="Edit akses pengguna"
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditing(row.original)}
                >
                  <Pencil className="size-4" />
                </Button>
              ),
            },
          ]}
        />
      )}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hak akses pengguna</DialogTitle>
            <DialogDescription>
              Identitas bersumber dari eGov/Simpeg. Penugasan dan otoritas
              disimpan di GASS.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-4"
            >
              {!editing.id && (
                <div className="field">
                  <Label htmlFor="employee">Cari pegawai eGov / Simpeg</Label>
                  <Input
                    id="employee"
                    placeholder="Minimal 3 karakter nama atau NIP"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {lookup.isFetching && (
                    <p className="text-xs text-muted-foreground">
                      Mencari pegawai…
                    </p>
                  )}
                  {lookup.error && (
                    <p className="text-xs text-destructive">
                      {lookup.error.message}
                    </p>
                  )}
                  <div className="max-h-40 overflow-auto">
                    {lookup.data?.map((p: any) => (
                      <button
                        type="button"
                        className="w-full text-left border-b p-2 text-xs hover:bg-muted"
                        key={p.egovId}
                        onClick={() => {
                          setEditing({ ...editing, nip: p.nip, name: p.name });
                          setSearch("");
                        }}
                      >
                        {p.name}
                        <span className="block text-muted-foreground text-[10px] mt-1">
                          {p.nip} · {p.unitKerja}
                        </span>
                      </button>
                    ))}
                    {lookup.data?.length === 0 && debounced.length >= 3 && (
                      <p className="text-xs text-muted-foreground p-2">
                        Pegawai tidak ditemukan.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">
                  {editing.name || "Pilih pegawai terlebih dahulu"}
                </p>
                <p className="text-xs text-muted-foreground">{editing.nip}</p>
              </div>
              <div className="field">
                <Label htmlFor="role">Peran</Label>
                <select
                  id="role"
                  className="filter-select"
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                >
                  {Object.entries(roleNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {editing.role === "OPERATOR_PUSKESMAS" && (
                <div className="field">
                  <Label htmlFor="faskes">Fasilitas kesehatan</Label>
                  <select
                    id="faskes"
                    required
                    className="filter-select"
                    value={editing.faskesId || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, faskesId: e.target.value })
                    }
                  >
                    <option value="">Pilih faskes</option>
                    {opts.data?.faskes.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.namaFaskes}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editing.role === "AKUN_BIDANG" && (
                <div className="field">
                  <Label htmlFor="bidang">Bidang</Label>
                  <select
                    id="bidang"
                    required
                    className="filter-select"
                    value={editing.bidangId || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, bidangId: e.target.value })
                    }
                  >
                    <option value="">Pilih bidang</option>
                    {opts.data?.bidang.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.namaBidang}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <Label htmlFor="email">Email pemberitahuan (opsional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={editing.email || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </div>
              <label className="flex gap-3 items-center text-sm">
                <Switch
                  checked={editing.isActive}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, isActive: v })
                  }
                />
                Akun aktif
              </label>
              {save.error && (
                <p role="alert" className="text-xs text-destructive">
                  {save.error.message}
                </p>
              )}
              <DialogFooter>
                <Button disabled={save.isPending || !editing.nip}>
                  Simpan hak akses
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function Audit() {
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api(`/admin/audit?page=${page}`),
  });
  const [detail, setDetail] = useState<any>(null);
  return (
    <>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <DataTable
          data={q.data.data}
          columns={[
            {
              accessorKey: "createdAt",
              header: "Waktu (WITA)",
              cell: ({ getValue }) =>
                new Date(String(getValue())).toLocaleString("id-ID", {
                  timeZone: "Asia/Makassar",
                }),
            },
            {
              accessorKey: "action",
              header: "Tindakan",
              cell: ({ getValue }) => (
                <Badge variant="outline">{String(getValue())}</Badge>
              ),
            },
            { accessorKey: "entity", header: "Modul" },
            { accessorKey: "userId", header: "ID pengguna" },
            {
              id: "detail",
              header: "Detail",
              cell: ({ row }) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetail(row.original)}
                >
                  Lihat
                </Button>
              ),
            },
          ]}
        />
      )}
      <div className="flex justify-end items-center gap-3 mt-4 text-xs">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Sebelumnya
        </Button>
        <span>Halaman {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= (q.data?.totalPages || 1)}
          onClick={() => setPage(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detail perubahan</DialogTitle>
            <DialogDescription>
              {detail?.entity} · {detail?.entityId}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-4 rounded-lg">
            {detail?.details
              ? JSON.stringify(JSON.parse(detail.details), null, 2)
              : "Tidak ada detail tambahan."}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
const descriptions: Record<string, string> = {
  jadwal:
    "Atur batas waktu, fase pra-launching, dan pengecualian pengisian laporan.",
  pengguna: "Tetapkan peran dan unit kerja pegawai yang dapat mengakses GASS.",
  otoritas: "Kelola akses menu secara dinamis untuk setiap kelompok pengguna.",
  audit: "Telusuri perubahan data dan aktivitas administrasi yang tercatat.",
};
export default function Admin({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = use(params);
  const title = navigation.find((n) => n.key === section)?.title;
  return (
    <>
      <div className="mb-6">
        <p className="eyebrow mb-2">ADMINISTRASI</p>
        <h1 className="page-heading">{title || "Halaman tidak ditemukan"}</h1>
        <p className="page-description">{descriptions[section]}</p>
      </div>
      {section === "jadwal" ? (
        <Settings />
      ) : section === "otoritas" ? (
        <Permissions />
      ) : section === "pengguna" ? (
        <Users />
      ) : section === "audit" ? (
        <Audit />
      ) : null}
    </>
  );
}
