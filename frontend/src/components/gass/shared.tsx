"use client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  LockKeyhole,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "./providers";
import { monthNames } from "./navigation";
import { api } from "@/lib/api";
export function StatusBadge({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 h-4.5 font-medium whitespace-nowrap inline-flex items-center gap-1 ${
        status === "HIJAU"
          ? "border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          : status === "KUNING"
            ? "border-amber-300/80 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
            : "border-rose-300/80 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current shrink-0" />
      {compact
        ? status === "HIJAU"
          ? "Tercapai"
          : status === "KUNING"
            ? "Perhatian"
            : "Kurang"
        : status === "HIJAU"
          ? "Tercapai"
          : status === "KUNING"
            ? "Perhatian"
            : "Perlu ditingkatkan"}
    </Badge>
  );
}
export function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-5">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div role="alert" className="empty-state">
      <AlertCircle />
      <h2>Data belum dapat dimuat</h2>
      <p>{error.message}</p>
      <Button variant="outline" onClick={retry}>
        <RefreshCw className="size-4" />
        Coba kembali
      </Button>
    </div>
  );
}
export interface Filters {
  tahun: number;
  faskesId: string;
  bidangId: string;
  triwulan: string;
  bulan: string;
}
export const initialFilters = (): Filters => ({
  tahun: new Date().getFullYear(),
  faskesId: "",
  bidangId: "",
  triwulan: "",
  bulan: "",
});
export function GlobalFilters({
  value,
  onChange,
  period = true,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  period?: boolean;
}) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["options"],
    queryFn: () => api("/options"),
  });
  const set = (key: keyof Filters, v: string) =>
    onChange({
      ...value,
      [key]: key === "tahun" ? Number(v) : v,
      ...(key === "triwulan"
        ? { bulan: "" }
        : key === "bulan"
          ? { triwulan: "" }
          : {}),
    });
  const year = new Date().getFullYear();
  return (
    <div className="rounded-xl border bg-card p-3 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-center gap-2.5 w-full">
        <select
          aria-label="Tahun anggaran"
          className="filter-select w-full lg:w-28 shrink-0"
          value={value.tahun}
          onChange={(e) => set("tahun", e.target.value)}
        >
          {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <div className="relative w-full lg:flex-[1.5] min-w-0">
          <select
            aria-label="Fasilitas kesehatan"
            className="filter-select w-full truncate"
            value={
              user?.role === "OPERATOR_PUSKESMAS"
                ? user.faskesId || ""
                : value.faskesId
            }
            disabled={user?.role === "OPERATOR_PUSKESMAS"}
            onChange={(e) => set("faskesId", e.target.value)}
          >
            <option value="">Semua fasilitas kesehatan</option>
            {data?.faskes.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.namaFaskes}
              </option>
            ))}
          </select>
          {user?.role === "OPERATOR_PUSKESMAS" && (
            <LockKeyhole className="size-3 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
          )}
        </div>
        <div className="relative w-full lg:flex-1 min-w-0">
          <select
            aria-label="Bidang"
            className="filter-select w-full truncate"
            value={
              user?.role === "AKUN_BIDANG" ? user.bidangId || "" : value.bidangId
            }
            disabled={user?.role === "AKUN_BIDANG"}
            onChange={(e) => set("bidangId", e.target.value)}
          >
            <option value="">Semua bidang</option>
            {data?.bidang.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.namaBidang}
              </option>
            ))}
          </select>
          {user?.role === "AKUN_BIDANG" && (
            <LockKeyhole className="size-3 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
          )}
        </div>
        {period && (
          <>
            <select
              aria-label="Triwulan"
              className="filter-select w-full lg:flex-1 min-w-0"
              value={value.triwulan}
              onChange={(e) => set("triwulan", e.target.value)}
            >
              <option value="">Semua triwulan</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  Triwulan {n}
                </option>
              ))}
            </select>
            <select
              aria-label="Bulan"
              className="filter-select w-full lg:flex-1 min-w-0"
              value={value.bulan}
              onChange={(e) => set("bulan", e.target.value)}
            >
              <option value="">Semua bulan</option>
              {monthNames.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
