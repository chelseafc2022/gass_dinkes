"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Printer, FileSpreadsheet, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { number, percent, rupiah } from "@/lib/api";

interface DashboardPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  filters: any;
  faskesName?: string;
  overallPuskesmasRanking: any[];
  user?: any;
  onExportXlsx?: () => void;
}

export function DashboardPrintDialog({
  open,
  onOpenChange,
  data,
  filters,
  faskesName,
  overallPuskesmasRanking,
  user,
  onExportXlsx,
}: DashboardPrintDialogProps) {
  const d = data;

  const spmIndicators = useMemo(() => {
    return (d?.indicators || []).filter(
      (i: any) => i.kategori === "SPM" || !i.kategori
    );
  }, [d?.indicators]);

  const sortedRanking = useMemo(() => {
    return [...(overallPuskesmasRanking || [])].sort(
      (a, b) => (b.persentase || 0) - (a.persentase || 0)
    );
  }, [overallPuskesmasRanking]);

  const kepalaDinas = d?.kepalaDinas || {
    nama: "NURLITA JAYA AS, S.Sos., M.Kes",
    nip: "197501042003122003",
    jabatan: "Kepala Dinas Kesehatan Kabupaten Konawe Selatan",
    pangkat: "Pembina Utama Muda, Gol. IV/c",
  };

  if (!d) return null;

  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HIJAU":
        return {
          label: "Tercapai",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300 print:border-emerald-700 print:text-emerald-900",
        };
      case "KUNING":
        return {
          label: "Dalam Proses",
          bg: "bg-amber-100 text-amber-800 border-amber-300 print:border-amber-700 print:text-amber-900",
        };
      case "MERAH":
      default:
        return {
          label: "Kurang",
          bg: "bg-rose-100 text-rose-800 border-rose-300 print:border-rose-700 print:text-rose-900",
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[98vw] sm:w-[96vw] sm:max-w-6xl md:max-w-6xl lg:max-w-7xl max-h-[94vh] h-[94vh] flex flex-col p-0 overflow-hidden bg-background shadow-2xl border-border/80">
        {/* Header Dialog (Tidak ikut dicetak) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-card/60 shrink-0 no-print">
          <div>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Printer className="size-4 text-primary" />
              Pratinjau & Cetak Laporan PDF
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Format laporan resmi Dinas Kesehatan Kabupaten Konawe Selatan
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {onExportXlsx && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportXlsx}
                className="text-xs h-8 gap-1.5 border-emerald-600/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                Ekspor Excel (XLSX)
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <Printer className="size-3.5" />
              Cetak / Simpan PDF
            </Button>

            <div className="h-5 w-px bg-border/80 mx-1" />

            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                title="Tutup dialog"
              >
                <X className="size-4" />
                <span className="sr-only">Tutup</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Kontainer Dokumen Cetak */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/70 dark:bg-slate-950/40">
          <div
            id="printable-report"
            className="w-full max-w-5xl mx-auto bg-white text-slate-900 p-8 sm:p-12 lg:p-14 rounded-2xl shadow-xl border border-slate-200/90 text-xs leading-relaxed print:p-0 print:border-0 print:shadow-none print:max-w-none print:w-full print:text-[10pt] print:bg-white"
          >
            {/* KOP SURAT RESMI */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b-4 border-double border-slate-900 mb-6">
              <div className="shrink-0 w-16 h-20 relative flex items-center justify-center">
                <Image
                  src="/branding/logo-konsel.webp"
                  alt="Lambang Kabupaten Konawe Selatan"
                  width={64}
                  height={80}
                  className="object-contain max-h-20"
                  priority
                />
              </div>

              <div className="text-center flex-1 px-4">
                <h3 className="font-bold text-xs sm:text-sm tracking-widest uppercase text-slate-800">
                  Pemerintah Kabupaten Konawe Selatan
                </h3>
                <h1 className="font-black text-sm sm:text-lg tracking-wide uppercase text-slate-950 mt-0.5">
                  Dinas Kesehatan
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1 leading-tight">
                  Kompleks Perkantoran Pemerintah Daerah Kabupaten Konawe Selatan, Andoolo 93382
                </p>
                <p className="text-[9.5px] sm:text-[10px] text-slate-500 mt-0.5">
                  Pos-el: dinkes@konaweselatankab.go.id · Laman: dinkes.konaweselatankab.go.id
                </p>
              </div>

              <div className="shrink-0 w-20 h-20 relative flex items-center justify-center">
                <Image
                  src="/branding/logo-gass.webp"
                  alt="Logo GASS Konawe Selatan"
                  width={80}
                  height={80}
                  className="object-contain max-h-20"
                  priority
                />
              </div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div className="text-center mb-6">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900 underline decoration-slate-400 underline-offset-4">
                Laporan Monitoring & Capaian Kinerja Kesehatan (GASS)
              </h2>
              <p className="font-semibold text-[11.5px] text-slate-800 mt-1">
                Tahun Anggaran {filters.tahun}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-2 border-y border-slate-200 py-1.5">
                <span>
                  <strong>Cakupan Faskes:</strong>{" "}
                  {faskesName || "Seluruh Fasilitas Kesehatan (Kabupaten)"}
                </span>
                <span>•</span>
                <span>
                  <strong>Tanggal Cetak:</strong> {printDate}
                </span>
              </div>
            </div>

            {/* 1. RINGKASAN EKSEKUTIF */}
            <div className="mb-6">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-800 inline-block" />
                I. Ringkasan Kinerja & Keuangan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-300 rounded-lg p-3 bg-slate-50 print:bg-white">
                <div className="border-r border-slate-200 pr-2">
                  <p className="text-[9.5px] text-slate-500 uppercase font-semibold">Rata-rata SPM</p>
                  <p className="text-sm font-bold text-emerald-800 mt-0.5">
                    {percent(d.summary?.capaian || 0)}%
                  </p>
                  <p className="text-[9px] text-slate-500">12 Indikator Layanan</p>
                </div>
                <div className="border-r border-slate-200 px-2">
                  <p className="text-[9.5px] text-slate-500 uppercase font-semibold">Serapan Anggaran</p>
                  <p className="text-sm font-bold text-teal-800 mt-0.5">
                    {percent(d.summary?.serapan || 0)}%
                  </p>
                  <p className="text-[9px] text-slate-500">Realisasi Keuangan</p>
                </div>
                <div className="border-r border-slate-200 px-2">
                  <p className="text-[9.5px] text-slate-500 uppercase font-semibold">Total Pagu</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                    {rupiah(d.summary?.targetKeuangan || 0)}
                  </p>
                  <p className="text-[9px] text-slate-500">DPA Dinkes</p>
                </div>
                <div className="pl-2">
                  <p className="text-[9.5px] text-slate-500 uppercase font-semibold">Faskes Terdaftar</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {d.summary?.faskes || 25} Faskes
                  </p>
                  <p className="text-[9px] text-slate-500">Puskesmas & RSUD</p>
                </div>
              </div>
            </div>

            {/* 2. TABEL INDIKATOR SPM */}
            <div className="mb-8">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-800 inline-block" />
                II. Capaian 12 Standar Pelayanan Minimal (SPM) Kesehatan
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="border border-slate-300 px-3 py-2 text-center w-10">No</th>
                    <th className="border border-slate-300 px-3 py-2 text-left">Nama Indikator SPM</th>
                    <th className="border border-slate-300 px-3 py-2 text-right w-28">Target (Orang)</th>
                    <th className="border border-slate-300 px-3 py-2 text-right w-28">Realisasi (Orang)</th>
                    <th className="border border-slate-300 px-3 py-2 text-right w-24">Capaian</th>
                    <th className="border border-slate-300 px-3 py-2 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {spmIndicators.map((ind: any, idx: number) => {
                    const badge = getStatusBadge(ind.status);
                    return (
                      <tr key={ind.id || idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 font-medium text-slate-900">
                          {ind.nama}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                          {number(ind.target || 0)}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-semibold">
                          {number(ind.realisasi || 0)}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                          {percent(ind.persentase || 0)}%
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[9.5px] font-semibold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 3. CAPAIAN PER FASILITAS KESEHATAN (PUSKESMAS) */}
            {sortedRanking.length > 0 && (
              <div className="mb-8 page-break-before">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-800 inline-block" />
                  III. Peringkat & Rata-rata Capaian SPM per Fasilitas Kesehatan
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 px-3 py-2 text-center w-12">Rank</th>
                      <th className="border border-slate-300 px-3 py-2 text-left">Nama Fasilitas Kesehatan</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-28">Realisasi (Orang)</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-28">Target (Orang)</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-24">Rata-rata SPM</th>
                      <th className="border border-slate-300 px-3 py-2 text-center w-28">SPM Tercapai</th>
                      <th className="border border-slate-300 px-3 py-2 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRanking.map((f: any, idx: number) => {
                      const badge = getStatusBadge(f.status);
                      return (
                        <tr key={f.faskesId || idx} className="hover:bg-slate-50/50">
                          <td className="border border-slate-300 px-3 py-1.5 text-center font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 font-medium text-slate-900">
                            {f.namaFaskes}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                            {number(f.realisasi || 0)}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right font-mono text-slate-600">
                            {number(f.target || 0)}
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                            {percent(f.persentase || 0)}%
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-center font-medium text-slate-700">
                            {f.tercapaiCount ?? 0} / 12 SPM
                          </td>
                          <td className="border border-slate-300 px-3 py-1.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. REALISASI ANGGARAN KEUANGAN */}
            {d.programs && d.programs.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-2.5 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-800 inline-block" />
                  IV. Realisasi Anggaran Keuangan per Program
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 px-3 py-2 text-center w-10">No</th>
                      <th className="border border-slate-300 px-3 py-2 text-center w-24">Kode</th>
                      <th className="border border-slate-300 px-3 py-2 text-left">Nama Program Kerja</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-32">Pagu Anggaran</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-32">Realisasi</th>
                      <th className="border border-slate-300 px-3 py-2 text-right w-24">Serapan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.programs.map((p: any, idx: number) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-center font-mono text-slate-600">
                          {p.kode || "-"}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 font-medium text-slate-900">
                          {p.nama}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                          {rupiah(p.target || 0)}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-semibold text-teal-800">
                          {rupiah(p.realisasi || 0)}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                          {percent(p.persentase || 0)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={3} className="border border-slate-300 px-3 py-2 text-center uppercase tracking-wide">
                        Total Anggaran Kesehatan
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono">
                        {rupiah(d.summary?.targetKeuangan || 0)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-teal-900">
                        {rupiah(d.summary?.realisasiKeuangan || 0)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono text-slate-900">
                        {percent(d.summary?.serapan || 0)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* LEMBAR PENGESAHAN */}
            <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-[10.5px]">
              {/* SISI KIRI: PETUGAS / PENGELOLA PROGRAM */}
              <div className="flex flex-col items-center text-center max-w-[280px]">
                <p className="text-transparent select-none text-[10.5px] leading-tight">
                  &nbsp;
                </p>
                <div className="h-12 flex flex-col justify-center mt-1">
                  <p className="font-semibold text-slate-800 leading-snug">
                    Pengelola Program / Operator SIM-GASS
                  </p>
                  <p className="text-slate-500 text-[9.5px]">
                    Dinas Kesehatan Kabupaten Konawe Selatan
                  </p>
                </div>
                <div className="h-20" />
                <div className="w-full">
                  <p className="font-bold text-slate-900 underline tracking-wide">
                    {user?.name || "Petugas Penanggung Jawab"}
                  </p>
                  <p className="text-slate-600 font-mono text-[9.5px] mt-1">
                    {user?.nip ? `NIP. ${user.nip}` : "Dinas Kesehatan Kab. Konawe Selatan"}
                  </p>
                  <p className="text-transparent select-none text-[9.5px] mt-0.5">
                    &nbsp;
                  </p>
                </div>
              </div>

              {/* SISI KANAN: KEPALA DINAS KESEHATAN */}
              <div className="flex flex-col items-center text-center max-w-[280px] ml-auto">
                <p className="text-slate-600 text-[10.5px] leading-tight">
                  Andoolo, {printDate}
                </p>
                <div className="h-12 flex flex-col justify-center mt-1">
                  <p className="font-semibold text-slate-800 leading-snug">
                    Mengetahui,<br />
                    {kepalaDinas.jabatan || "Kepala Dinas Kesehatan Kabupaten Konawe Selatan"}
                  </p>
                </div>
                <div className="h-20" />
                <div className="w-full">
                  <p className="font-bold text-slate-900 underline tracking-wide">
                    {kepalaDinas.nama}
                  </p>
                  <p className="text-slate-600 font-mono text-[9.5px] mt-1">
                    {kepalaDinas.nip ? `NIP. ${kepalaDinas.nip}` : "NIP. 197501042003122003"}
                  </p>
                  <p className="text-slate-600 text-[9.5px] mt-0.5">
                    {kepalaDinas.pangkat || "Pembina Utama Muda, Gol. IV/c"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
