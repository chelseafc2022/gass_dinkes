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
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "HIJAU"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "KUNING"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
      }
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status === "HIJAU"
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
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-card p-3 mb-6">
      <span className="flex items-center gap-2 text-xs font-medium px-1 mr-1">
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        Filter data
      </span>
      <select
        aria-label="Tahun anggaran"
        className="filter-select"
        value={value.tahun}
        onChange={(e) => set("tahun", e.target.value)}
      >
        {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      <select
        aria-label="Fasilitas kesehatan"
        className="filter-select max-w-64"
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
        <LockKeyhole className="size-3 text-muted-foreground" />
      )}
      <select
        aria-label="Bidang"
        className="filter-select max-w-56"
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
      {period && (
        <>
          <select
            aria-label="Triwulan"
            className="filter-select"
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
            className="filter-select"
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
  );
}
