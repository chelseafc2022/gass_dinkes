import { z } from "zod";
export const roles = [
  "ADMIN_DINKES",
  "AKUN_BIDANG",
  "OPERATOR_PUSKESMAS",
  "KEPALA_DINAS",
] as const;
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(roles),
  permissions: z.array(z.string()),
  faskesId: z.string().nullable(),
  bidangId: z.string().nullable(),
  faskes: z.object({ namaFaskes: z.string() }).nullable().optional(),
});
export type User = z.infer<typeof userSchema>;
export type Kind = "kinerja" | "keuangan";
export const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const monthKeys = [
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
export const numeric = z.number().finite().min(0).max(1e14);
export const reportInput = z.object({
  entityId: z.string().min(1).max(100),
  faskesId: z.string().min(1).max(100),
  tahun: z.number().int().min(2000).max(2100),
  bulan: z.number().int().min(1).max(12),
  nilai: numeric,
  target: numeric.optional(),
  expectedUpdatedAt: z.iso.datetime().nullable(),
});
export type ReportInput = z.infer<typeof reportInput>;
export type Report = {
  id: string;
  indikatorId?: string;
  subKegiatanId?: string;
  label: string;
  faskesId: string;
  faskes: { namaFaskes: string };
  tahun: number;
  target: number;
  persentase: number;
  updatedAt: string;
  canVerify: boolean;
  verifikasiBulanan: {
    bulan: number;
    isValidated: boolean;
    submittedAt: string | null;
    verifiedBy?: { name: string } | null;
  }[];
} & Record<(typeof monthKeys)[number], number>;
export type Reports = {
  data: Report[];
  available: { id: string; namaIndikator?: string; namaSubKegiatan?: string }[];
  months: { bulan: number; open: boolean }[];
};
export type Options = {
  faskes: { id: string; namaFaskes: string }[];
  bidangs: { id: string; namaBidang: string }[];
};
export const canWrite = (u: User) => u.role !== "KEPALA_DINAS";
export const canVerify = (u: User) =>
  ["ADMIN_DINKES", "AKUN_BIDANG"].includes(u.role);
export const allowed = (u: User, menu: string) => u.permissions.includes(menu);
export function decimal(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Masukkan angka positif, maksimal 2 desimal, tanpa pemisah ribuan.",
    );
  return numeric.parse(Number(value.trim().replace(",", ".")));
}
export const format = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
export const currentPeriod = () => {
  const now = new Date(Date.now() + 8 * 3600000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
};
