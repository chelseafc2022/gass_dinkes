import { BadRequestException, ForbiddenException } from "@nestjs/common";
export const ROLES = [
  "ADMIN_DINKES",
  "AKUN_BIDANG",
  "OPERATOR_PUSKESMAS",
  "KEPALA_DINAS",
] as const;
export const MENUS = [
  "dashboard",
  "master_satuan",
  "master_program",
  "master_kegiatan",
  "master_sub_kegiatan",
  "master_indikator",
  "master_kecamatan",
  "master_faskes",
  "master_bidang",
  "capaian_kinerja",
  "capaian_keuangan",
  "jadwal",
  "pengguna",
  "otoritas",
  "audit",
] as const;
export interface Actor {
  id: string;
  role: string;
  faskesId: string | null;
  bidangId: string | null;
  name: string;
  nip: string;
  isActive: boolean;
}
export const MONTHS = [
  "capaianJan",
  "capaianFeb",
  "capaianMar",
  "capaianApr",
  "capaianMei",
  "capaianJun",
  "capaianJul",
  "capaianAgs",
  "capaianSep",
  "capaianOkt",
  "capaianNov",
  "capaianDes",
] as const;
export function defaultPermission(role: string, menu: string) {
  if (role === "ADMIN_DINKES") return true;
  if (["dashboard", "capaian_kinerja", "capaian_keuangan"].includes(menu))
    return true;
  return (
    role === "AKUN_BIDANG" &&
    ["master_program", "master_kegiatan", "master_sub_kegiatan"].includes(menu)
  );
}
export function hardPermission(role: string, menu: string) {
  if (role === "OPERATOR_PUSKESMAS" || role === "KEPALA_DINAS")
    return ["dashboard", "capaian_kinerja", "capaian_keuangan"].includes(menu);
  if (role === "AKUN_BIDANG") return defaultPermission(role, menu);
  return role === "ADMIN_DINKES";
}
export function assertWriter(u: Actor) {
  if (u.role === "KEPALA_DINAS")
    throw new ForbiddenException("Akun Kepala Dinas hanya dapat memantau.");
}
export function facilityScope(u: Actor, requested?: string) {
  if (u.role !== "OPERATOR_PUSKESMAS") return requested || undefined;
  if (!u.faskesId || (requested && requested !== u.faskesId))
    throw new ForbiddenException("Akses dibatasi pada faskes Anda.");
  return u.faskesId;
}
export function percentage(value: number, target: number) {
  return target > 0 ? (value / target) * 100 : 0;
}
export function status(
  value: number,
  target: number,
  indicator?: {
    jenisThreshold: string;
    thresholdHijauMin: number;
    thresholdKuningMin: number;
  },
) {
  const n =
    indicator?.jenisThreshold === "NILAI_ABSOLUT"
      ? value
      : percentage(value, target);
  return n >= (indicator?.thresholdHijauMin ?? 80)
    ? "HIJAU"
    : n >= (indicator?.thresholdKuningMin ?? 50)
      ? "KUNING"
      : "MERAH";
}
export function periodOpen(
  year: number,
  month: number,
  settings: {
    batasTanggalInput: number;
    isOtomatisAktif: boolean;
    mulaiOtomatisPeriode?: string | null;
  },
  override?: { statusOverride: string; batasKhusus?: Date | null } | null,
  now = new Date(),
) {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  )
    throw new BadRequestException("Periode tidak valid.");
  if (override)
    return (
      override.statusOverride === "BUKA" &&
      (!override.batasKhusus || now <= override.batasKhusus)
    );
  if (!settings.isOtomatisAktif) return true;
  if (
    settings.mulaiOtomatisPeriode &&
    `${year}-${String(month).padStart(2, "0")}` < settings.mulaiOtomatisPeriode
  )
    return true;
  // Makassar (UTC+8), deadline inclusive at 23:59:59.999 on next month's cutoff day.
  const deadline = new Date(
    Date.UTC(year, month, settings.batasTanggalInput, 15, 59, 59, 999),
  );
  return now <= deadline;
}
