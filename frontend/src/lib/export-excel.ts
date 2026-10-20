import writeXlsxFile, { type Sheet } from "write-excel-file/browser";

interface ExportDashboardOptions {
  tahun: number;
  faskesName?: string;
  summary: {
    capaian: number;
    serapan: number;
    targetKeuangan: number;
    realisasiKeuangan: number;
    faskes?: number;
    indikator?: number;
  };
  indicators: any[];
  overallPuskesmasRanking: any[];
  programs: any[];
}

export async function exportDashboardToXlsx({
  tahun,
  faskesName,
  summary,
  indicators,
  overallPuskesmasRanking,
  programs,
}: ExportDashboardOptions) {
  const round2 = (num: number) => Math.round((num || 0) * 100) / 100;

  // Header styles
  const headerBg = "#064E3B"; // Deep Emerald
  const tealBg = "#0F766E"; // Deep Teal
  const darkTealBg = "#134E4A"; // Dark Teal

  const thStyle = (bg = headerBg) => ({
    fontWeight: "bold" as const,
    color: "#FFFFFF",
    backgroundColor: bg,
    align: "center" as const,
    alignVertical: "center" as const,
    borderColor: "#CBD5E1",
  });

  const tdStyle = (align: "left" | "center" | "right" = "left", bold = false) => ({
    align,
    alignVertical: "center" as const,
    fontWeight: bold ? ("bold" as const) : undefined,
    borderColor: "#E2E8F0",
  });

  // ==========================================
  // SHEET 1: Ringkasan & 12 Indikator SPM
  // ==========================================
  const spmIndicators = indicators.filter((i) => i.kategori === "SPM" || !i.kategori);

  const sheet1Data: any[] = [
    // Judul
    [
      {
        value: "PEMERINTAH KABUPATEN KONAWE SELATAN — DINAS KESEHATAN",
        fontWeight: "bold",
        fontSize: 12,
        color: "#064E3B",
      },
    ],
    [
      {
        value: "LAPORAN MONITORING & EVALUASI CAPAIAN KINERJA KESEHATAN (GASS)",
        fontWeight: "bold",
        fontSize: 14,
        color: "#0F766E",
      },
    ],
    [
      {
        value: `Tahun Anggaran: ${tahun} | Fasilitas Kesehatan: ${faskesName || "Seluruh Fasilitas Kesehatan (Kabupaten)"}`,
        fontStyle: "italic",
        color: "#475569",
      },
    ],
    [], // empty row
    // Blok KPI Ringkasan
    [
      { value: "RINGKASAN EKSEKUTIF", fontWeight: "bold", backgroundColor: "#D1FAE5", color: "#064E3B" },
      { value: "", backgroundColor: "#D1FAE5" },
    ],
    [
      { value: "Rata-rata Capaian SPM", fontWeight: "bold" },
      { type: Number, value: round2(summary.capaian), format: "0.00\"%\"", fontWeight: "bold", color: "#064E3B" },
    ],
    [
      { value: "Persentase Serapan Keuangan", fontWeight: "bold" },
      { type: Number, value: round2(summary.serapan), format: "0.00\"%\"", fontWeight: "bold", color: "#0F766E" },
    ],
    [
      { value: "Pagu Anggaran Kesehatan", fontWeight: "bold" },
      { type: Number, value: summary.targetKeuangan, format: "\"Rp \"#,##0", fontWeight: "bold" },
    ],
    [
      { value: "Realisasi Anggaran Kesehatan", fontWeight: "bold" },
      { type: Number, value: summary.realisasiKeuangan, format: "\"Rp \"#,##0", fontWeight: "bold" },
    ],
    [], // empty row
    // Table Header
    [
      { ...thStyle(), value: "No" },
      { ...thStyle(), value: "Nama Indikator Pelayanan Kesehatan" },
      { ...thStyle(), value: "Kategori" },
      { ...thStyle(), value: "Target Sasaran (Orang)" },
      { ...thStyle(), value: "Jumlah Realisasi (Orang)" },
      { ...thStyle(), value: "Capaian (%)" },
      { ...thStyle(), value: "Status Evaluasi" },
    ],
  ];

  // Table rows SPM
  spmIndicators.forEach((ind, idx) => {
    const statusText =
      ind.status === "HIJAU"
        ? "Tercapai (Hijau)"
        : ind.status === "KUNING"
        ? "Dalam Proses (Kuning)"
        : "Kurang (Merah)";

    const statusColor =
      ind.status === "HIJAU"
        ? "#059669"
        : ind.status === "KUNING"
        ? "#D97706"
        : "#DC2626";

    sheet1Data.push([
      { ...tdStyle("center"), type: Number, value: idx + 1 },
      { ...tdStyle("left"), type: String, value: ind.nama },
      { ...tdStyle("center"), type: String, value: ind.kategori || "SPM" },
      { ...tdStyle("right"), type: Number, value: ind.target || 0, format: "#,##0" },
      { ...tdStyle("right"), type: Number, value: ind.realisasi || 0, format: "#,##0" },
      {
        ...tdStyle("right", true),
        type: Number,
        value: round2(ind.persentase || 0),
        format: "0.00\"%\"",
      },
      {
        ...tdStyle("center", true),
        type: String,
        value: statusText,
        color: statusColor,
      },
    ]);
  });

  // ==========================================
  // SHEET 2: Capaian per Fasilitas Kesehatan
  // ==========================================
  const sheet2Data: any[] = [
    [
      {
        value: "PERINGKAT & CAPAIAN 12 INDIKATOR SPM PER FASILITAS KESEHATAN",
        fontWeight: "bold",
        fontSize: 13,
        color: "#0F766E",
      },
    ],
    [
      {
        value: `Tahun Anggaran: ${tahun} | Dinas Kesehatan Kabupaten Konawe Selatan`,
        fontStyle: "italic",
        color: "#475569",
      },
    ],
    [],
    [
      { ...thStyle(tealBg), value: "Peringkat" },
      { ...thStyle(tealBg), value: "Nama Fasilitas Kesehatan" },
      { ...thStyle(tealBg), value: "Jumlah Realisasi (Orang)" },
      { ...thStyle(tealBg), value: "Target Sasaran (Orang)" },
      { ...thStyle(tealBg), value: "Rata-rata SPM (%)" },
      { ...thStyle(tealBg), value: "Indikator Tercapai" },
      { ...thStyle(tealBg), value: "Status Capaian" },
    ],
  ];

  // Sort overall Puskesmas by percentage descending
  const sortedRanking = [...overallPuskesmasRanking].sort(
    (a, b) => (b.persentase || 0) - (a.persentase || 0)
  );

  sortedRanking.forEach((f, idx) => {
    const statusText =
      f.status === "HIJAU"
        ? "Tercapai (Hijau)"
        : f.status === "KUNING"
        ? "Dalam Proses (Kuning)"
        : "Kurang (Merah)";

    const statusColor =
      f.status === "HIJAU"
        ? "#059669"
        : f.status === "KUNING"
        ? "#D97706"
        : "#DC2626";

    sheet2Data.push([
      { ...tdStyle("center"), type: Number, value: idx + 1 },
      { ...tdStyle("left", true), type: String, value: f.namaFaskes },
      { ...tdStyle("right"), type: Number, value: f.realisasi || 0, format: "#,##0" },
      { ...tdStyle("right"), type: Number, value: f.target || 0, format: "#,##0" },
      {
        ...tdStyle("right", true),
        type: Number,
        value: round2(f.persentase || 0),
        format: "0.00\"%\"",
      },
      {
        ...tdStyle("center"),
        type: String,
        value: `${f.tercapaiCount ?? 0} / 12 SPM`,
      },
      {
        ...tdStyle("center", true),
        type: String,
        value: statusText,
        color: statusColor,
      },
    ]);
  });

  // ==========================================
  // SHEET 3: Realisasi Anggaran Keuangan
  // ==========================================
  const sheet3Data: any[] = [
    [
      {
        value: "LAPORAN SERAPAN ANGGARAN PROGRAM KESEHATAN",
        fontWeight: "bold",
        fontSize: 13,
        color: "#134E4A",
      },
    ],
    [
      {
        value: `Tahun Anggaran: ${tahun} | Dinas Kesehatan Kabupaten Konawe Selatan`,
        fontStyle: "italic",
        color: "#475569",
      },
    ],
    [],
    [
      { ...thStyle(darkTealBg), value: "No" },
      { ...thStyle(darkTealBg), value: "Kode Program" },
      { ...thStyle(darkTealBg), value: "Nama Program Kerja" },
      { ...thStyle(darkTealBg), value: "Pagu Anggaran" },
      { ...thStyle(darkTealBg), value: "Realisasi Keuangan" },
      { ...thStyle(darkTealBg), value: "Sisa Anggaran" },
      { ...thStyle(darkTealBg), value: "Serapan (%)" },
    ],
  ];

  (programs || []).forEach((p, idx) => {
    const sisa = Math.max(0, (p.target || 0) - (p.realisasi || 0));
    sheet3Data.push([
      { ...tdStyle("center"), type: Number, value: idx + 1 },
      { ...tdStyle("center"), type: String, value: p.kode || "-" },
      { ...tdStyle("left"), type: String, value: p.nama },
      { ...tdStyle("right"), type: Number, value: p.target || 0, format: "\"Rp \"#,##0" },
      { ...tdStyle("right"), type: Number, value: p.realisasi || 0, format: "\"Rp \"#,##0" },
      { ...tdStyle("right"), type: Number, value: sisa, format: "\"Rp \"#,##0" },
      {
        ...tdStyle("right", true),
        type: Number,
        value: round2(p.persentase || 0),
        format: "0.00\"%\"",
      },
    ]);
  });

  // Total Keuangan Row
  sheet3Data.push([
    { ...tdStyle("center", true), value: "TOTAL" },
    { ...tdStyle("center"), value: "" },
    { ...tdStyle("left", true), value: "TOTAL SERAPAN ANGGARAN KESEHATAN" },
    { ...tdStyle("right", true), type: Number, value: summary.targetKeuangan, format: "\"Rp \"#,##0" },
    { ...tdStyle("right", true), type: Number, value: summary.realisasiKeuangan, format: "\"Rp \"#,##0" },
    {
      ...tdStyle("right", true),
      type: Number,
      value: Math.max(0, summary.targetKeuangan - summary.realisasiKeuangan),
      format: "\"Rp \"#,##0",
    },
    {
      ...tdStyle("right", true),
      type: Number,
      value: round2(summary.serapan),
      format: "0.00\"%\"",
      color: "#0F766E",
    },
  ]);

  // Construct sheets with column width definitions
  const sheets: Sheet<any>[] = [
    {
      sheet: "Ringkasan & 12 SPM",
      columns: [
        { width: 6 }, // No
        { width: 46 }, // Indikator
        { width: 14 }, // Kategori
        { width: 22 }, // Target
        { width: 24 }, // Realisasi
        { width: 16 }, // Capaian %
        { width: 24 }, // Status
      ],
      data: sheet1Data,
    },
    {
      sheet: "Capaian per Faskes",
      columns: [
        { width: 10 }, // Peringkat
        { width: 36 }, // Nama Faskes
        { width: 24 }, // Realisasi
        { width: 22 }, // Target
        { width: 18 }, // Rata-rata SPM %
        { width: 22 }, // Indikator Tercapai
        { width: 24 }, // Status Capaian
      ],
      data: sheet2Data,
    },
    {
      sheet: "Realisasi Keuangan",
      columns: [
        { width: 6 }, // No
        { width: 16 }, // Kode
        { width: 48 }, // Nama Program
        { width: 24 }, // Pagu
        { width: 24 }, // Realisasi
        { width: 24 }, // Sisa
        { width: 16 }, // Serapan %
      ],
      data: sheet3Data,
    },
  ];

  await writeXlsxFile(sheets).toFile(
    `Laporan-GASS-Konawe-Selatan-${tahun}.xlsx`
  );
}
