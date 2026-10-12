"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UserCheck,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { api, write } from "@/lib/api";

export const GASS_ROLES = [
  {
    value: "ADMIN_DINKES",
    label: "Admin Dinas Kesehatan",
    shortLabel: "Admin Dinkes",
    desc: "Akses penuh konfigurasi master data, batas jadwal, penugasan pengguna, dan validasi kabupaten.",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  {
    value: "AKUN_BIDANG",
    label: "Akun Bidang Dinas Kesehatan",
    shortLabel: "Akun Bidang",
    desc: "Pengelola dan verifikator capaian indikator kesehatan pada bidang penugasan terkait di Dinas Kesehatan.",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    requiresScope: "bidang",
  },
  {
    value: "OPERATOR_PUSKESMAS",
    label: "Operator Fasilitas Kesehatan (Puskesmas)",
    shortLabel: "Operator Puskesmas",
    desc: "Entri dan pembaruan berkala capaian kinerja bulanan & realisasi keuangan belanja Puskesmas.",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    requiresScope: "faskes",
  },
  {
    value: "KEPALA_DINAS",
    label: "Kepala Dinas Kesehatan",
    shortLabel: "Kepala Dinas",
    desc: "Executive view monitoring menyeluruh capaian indikator kesehatan dan realisasi anggaran daerah.",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
];

export interface TargetPegawai {
  nip: string;
  namaLengkap: string;
  jabatan?: string;
  opd?: string;
  unitKerja?: string;
  currentRole?: string | null;
  currentStatus?: string | null;
  username?: string;
  faskesId?: string | null;
  bidangId?: string | null;
  email?: string | null;
}

interface SetRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TargetPegawai | null;
}

export function SetRoleDialog({
  open,
  onOpenChange,
  target,
}: SetRoleDialogProps) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("OPERATOR_PUSKESMAS");
  const [faskesId, setFaskesId] = useState<string>("");
  const [bidangId, setBidangId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Ambil data referensi faskes dan bidang
  const optionsQuery = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setShowConfirmReset(false);
    if (target?.currentRole) {
      setSelectedRole(target.currentRole);
    } else {
      // Default: jika dari unit kerja puskesmas, pilih operator puskesmas
      const isPuskesmas =
        target?.unitKerja?.toUpperCase().includes("PUSKESMAS") || false;
      setSelectedRole(isPuskesmas ? "OPERATOR_PUSKESMAS" : "ADMIN_DINKES");
    }

    setFaskesId(target?.faskesId || "");
    setBidangId(target?.bidangId || "");
    setEmail(target?.email || "");

    // Coba auto-match faskes dari nama unit kerja jika belum terpilih
    if (!target?.faskesId && target?.unitKerja && optionsQuery.data?.faskes) {
      const unitUpper = target.unitKerja.toUpperCase();
      const matched = optionsQuery.data.faskes.find((f: any) => {
        const nameUpper = f.namaFaskes.toUpperCase();
        return unitUpper.includes(nameUpper) || nameUpper.includes(unitUpper);
      });
      if (matched) {
        setFaskesId(matched.id);
      }
    }
  }, [target, open, optionsQuery.data]);

  // Mutation untuk simpan / ubah role
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      return write(
        "/admin/users/set-role",
        {
          nip: target.nip,
          role: selectedRole,
          faskesId: selectedRole === "OPERATOR_PUSKESMAS" ? faskesId || null : null,
          bidangId: selectedRole === "AKUN_BIDANG" ? bidangId || null : null,
          email: email.trim() || null,
        },
        "POST",
      );
    },
    onSuccess: (data) => {
      toast.success(
        data?.message ||
          `Hak akses berhasil ditetapkan untuk ${target?.namaLengkap}`,
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["pegawai-directory"] });
      queryClient.invalidateQueries({ queryKey: ["users-stats"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menetapkan peran");
    },
  });

  // Mutation untuk kembalikan ke default (Belum Diberi Akses)
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      return write(
        "/admin/users/reset-to-default",
        {
          nip: target.nip,
        },
        "POST",
      );
    },
    onSuccess: (data) => {
      toast.success(
        data?.message ||
          `Peran untuk ${target?.namaLengkap} telah dikembalikan ke default`,
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["pegawai-directory"] });
      queryClient.invalidateQueries({ queryKey: ["users-stats"] });
      setShowConfirmReset(false);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengembalikan ke default");
    },
  });

  const hasExistingRole = !!target?.currentRole;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            Penetapan / Ubah Hak Akses Peran
          </DialogTitle>
          <DialogDescription>
            Tetapkan peran akun GASS untuk pegawai Dinas Kesehatan. Data profil
            diambil langsung dari server E-Gov & SIMPEG.
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Pegawai Info Box */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-semibold text-foreground text-sm block">
                    {target.namaLengkap}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-muted-foreground font-mono">
                      NIP: {target.nip}
                    </span>
                    {target.username && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono px-1.5 py-0"
                      >
                        @{target.username}
                      </Badge>
                    )}
                  </div>
                </div>
                {target.currentRole ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      GASS_ROLES.find((r) => r.value === target.currentRole)
                        ?.badgeClass || ""
                    }`}
                  >
                    {GASS_ROLES.find((r) => r.value === target.currentRole)
                      ?.shortLabel || target.currentRole}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-muted-foreground font-normal"
                  >
                    Belum Diberi Akses
                  </Badge>
                )}
              </div>
              {target.jabatan && (
                <div className="text-muted-foreground">
                  Jabatan:{" "}
                  <span className="text-foreground font-medium">
                    {target.jabatan}
                  </span>
                </div>
              )}
              {target.unitKerja && (
                <div className="text-muted-foreground">
                  Sub Unit / Puskesmas:{" "}
                  <span className="text-foreground font-medium">
                    {target.unitKerja}
                  </span>
                </div>
              )}
            </div>

            {/* Role Header */}
            <div>
              <span className="text-xs font-semibold text-foreground block">
                Pilih Kelompok Peran (Role)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Tentukan otoritas dan batasan menu operasional untuk pegawai ini
              </p>
            </div>

            {/* Role Options */}
            <div className="space-y-2">
              {GASS_ROLES.map((role) => {
                const isSelected = selectedRole === role.value;
                return (
                  <div
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                        : "hover:bg-muted/50 border-border/70"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`size-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {isSelected && (
                          <div className="size-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {role.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0 rounded border font-medium ${role.badgeClass}`}
                        >
                          {role.shortLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {role.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scope Penugasan jika Operator Puskesmas */}
            {selectedRole === "OPERATOR_PUSKESMAS" && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <Label
                  htmlFor="faskes-select"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <span>Penugasan Fasilitas Kesehatan (Puskesmas)</span>
                  <span className="text-destructive">*</span>
                </Label>
                <select
                  id="faskes-select"
                  value={faskesId}
                  onChange={(e) => setFaskesId(e.target.value)}
                  className="filter-select w-full h-9 text-xs"
                  required
                >
                  <option value="">-- Pilih Fasilitas Kesehatan --</option>
                  {optionsQuery.data?.faskes?.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.namaFaskes} ({f.jenisFaskes})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Pengguna hanya dapat menginput dan memperbarui capaian kinerja
                  dan belanja pada Puskesmas yang ditugaskan.
                </p>
              </div>
            )}

            {/* Scope Penugasan jika Akun Bidang */}
            {selectedRole === "AKUN_BIDANG" && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <Label
                  htmlFor="bidang-select"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <span>Penugasan Bidang Dinas Kesehatan</span>
                  <span className="text-destructive">*</span>
                </Label>
                <select
                  id="bidang-select"
                  value={bidangId}
                  onChange={(e) => setBidangId(e.target.value)}
                  className="filter-select w-full h-9 text-xs"
                  required
                >
                  <option value="">-- Pilih Bidang Penanggung Jawab --</option>
                  {optionsQuery.data?.bidang?.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.namaBidang}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Pengguna bertanggung jawab atas target dan capaian indikator
                  pada bidang ini.
                </p>
              </div>
            )}

            {/* Email Notifikasi (Opsional) */}
            <div className="space-y-1.5">
              <Label htmlFor="email-input" className="text-xs">
                Email Pemberitahuan (Opsional)
              </Label>
              <Input
                id="email-input"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Konfirmasi Reset ke Default */}
            {hasExistingRole && (
              <div className="pt-2 border-t">
                {!showConfirmReset ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmReset(true)}
                    className="text-xs text-muted-foreground hover:text-destructive h-8 px-2 gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Kembalikan ke Default (Hapus Akses GASS)
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-destructive font-semibold">
                      <ShieldAlert className="h-4 w-4" />
                      Yakin ingin mengembalikan ke default?
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Akun pegawai akan dihapus dari sistem GASS dan statusnya
                      kembali menjadi{" "}
                      <strong className="text-foreground">
                        Belum Diberi Akses
                      </strong>
                      . Pegawai tidak dapat login sampai diberikan peran
                      kembali.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => resetMutation.mutate()}
                        disabled={resetMutation.isPending}
                        className="h-7 text-xs"
                      >
                        {resetMutation.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        )}
                        Ya, Hapus Akses
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfirmReset(false)}
                        className="h-7 text-xs"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 shrink-0 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending || resetMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending ||
              resetMutation.isPending ||
              (selectedRole === "OPERATOR_PUSKESMAS" && !faskesId) ||
              (selectedRole === "AKUN_BIDANG" && !bidangId)
            }
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Simpan Hak Akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
