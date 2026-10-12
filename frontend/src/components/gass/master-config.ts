export interface Field {
  key: string;
  label: string;
  type?: "number" | "boolean" | "textarea" | "select" | "multi";
  required?: boolean;
  source?: string;
  options?: string[];
  default?: any;
}
export const masterConfig: Record<
  string,
  { title: string; description: string; name: string; fields: Field[] }
> = {
  satuan: {
    title: "Satuan",
    description: "Standarkan satuan pengukuran untuk seluruh indikator.",
    name: "namaSatuan",
    fields: [
      { key: "namaSatuan", label: "Nama satuan", required: true },
      { key: "simbol", label: "Simbol / singkatan" },
      { key: "keterangan", label: "Keterangan", type: "textarea" },
    ],
  },
  program: {
    title: "Program",
    description:
      "Kelola program kerja tahunan dan akses keuangan fasilitas kesehatan.",
    name: "namaProgram",
    fields: [
      {
        key: "tahun",
        label: "Tahun anggaran",
        type: "number",
        default: new Date().getFullYear(),
        required: true,
      },
      { key: "kodeProgram", label: "Kode program", required: true },
      {
        key: "namaProgram",
        label: "Nama program",
        type: "textarea",
        required: true,
      },
      {
        key: "bidangId",
        label: "Bidang pengelola",
        type: "select",
        source: "bidang",
      },
      {
        key: "isAksesFaskes",
        label: "Izinkan input keuangan oleh faskes",
        type: "boolean",
        default: false,
      },
    ],
  },
  kegiatan: {
    title: "Kegiatan",
    description: "Rincian kegiatan pada setiap program kesehatan.",
    name: "namaKegiatan",
    fields: [
      {
        key: "programId",
        label: "Program",
        type: "select",
        source: "program",
        required: true,
      },
      { key: "kodeKegiatan", label: "Kode kegiatan", required: true },
      {
        key: "namaKegiatan",
        label: "Nama kegiatan",
        type: "textarea",
        required: true,
      },
    ],
  },
  sub_kegiatan: {
    title: "Sub kegiatan",
    description: "Unit operasional untuk indikator dan realisasi anggaran.",
    name: "namaSubKegiatan",
    fields: [
      {
        key: "kegiatanId",
        label: "Kegiatan",
        type: "select",
        source: "kegiatan",
        required: true,
      },
      { key: "kodeSubKegiatan", label: "Kode sub kegiatan", required: true },
      {
        key: "namaSubKegiatan",
        label: "Nama sub kegiatan",
        type: "textarea",
        required: true,
      },
    ],
  },
  indikator: {
    title: "Indikator",
    description:
      "Tolok ukur kinerja, ambang capaian, dan penanggung jawab bidang.",
    name: "namaIndikator",
    fields: [
      {
        key: "subKegiatanId",
        label: "Sub kegiatan",
        type: "select",
        source: "sub_kegiatan",
        required: true,
      },
      {
        key: "namaIndikator",
        label: "Nama indikator",
        type: "textarea",
        required: true,
      },
      {
        key: "satuanId",
        label: "Satuan",
        type: "select",
        source: "satuan",
        required: true,
      },
      {
        key: "kategoriIndikator",
        label: "Kategori",
        type: "select",
        options: ["IKK", "IKU", "SPM", "INDIKATOR_PROGRAM"],
        default: "SPM",
        required: true,
      },
      {
        key: "jenisThreshold",
        label: "Basis threshold",
        type: "select",
        options: ["PERSENTASE_TARGET", "NILAI_ABSOLUT"],
        default: "PERSENTASE_TARGET",
        required: true,
      },
      {
        key: "thresholdHijauMin",
        label: "Batas bawah hijau",
        type: "number",
        default: 80,
        required: true,
      },
      {
        key: "thresholdKuningMin",
        label: "Batas bawah kuning",
        type: "number",
        default: 50,
        required: true,
      },
      {
        key: "thresholdMerahMax",
        label: "Batas atas merah",
        type: "number",
        default: 49.9,
        required: true,
      },
      {
        key: "bidangIds",
        label: "Bidang penanggung jawab (pilih satu atau lebih)",
        type: "multi",
        source: "bidang",
        required: true,
      },
    ],
  },
  kecamatan: {
    title: "Kecamatan",
    description: "Wilayah administratif fasilitas pelayanan kesehatan.",
    name: "namaKecamatan",
    fields: [
      { key: "kodeKecamatan", label: "Kode kecamatan", required: true },
      { key: "namaKecamatan", label: "Nama kecamatan", required: true },
    ],
  },
  faskes: {
    title: "Fasilitas kesehatan",
    description: "Kelola puskesmas dan unit layanan pelapor kinerja.",
    name: "namaFaskes",
    fields: [
      { key: "namaFaskes", label: "Nama fasilitas kesehatan", required: true },
      {
        key: "jenisFaskes",
        label: "Jenis fasilitas",
        type: "select",
        options: ["PUSKESMAS", "KLINIK", "RUMAH_SAKIT", "LABORATORIUM"],
        default: "PUSKESMAS",
        required: true,
      },
      {
        key: "kecamatanId",
        label: "Kecamatan",
        type: "select",
        source: "kecamatan",
        required: true,
      },
      { key: "alamat", label: "Alamat", type: "textarea" },
    ],
  },
  bidang: {
    title: "Bidang / penanggung jawab",
    description: "Bidang teknis pembina program dan indikator kesehatan.",
    name: "namaBidang",
    fields: [
      { key: "kodeBidang", label: "Kode bidang" },
      { key: "namaBidang", label: "Nama bidang", required: true },
      { key: "kepalaBidang", label: "Kepala bidang" },
    ],
  },
};
export const optionLabel = (r: any) =>
  r.namaProgram
    ? `${r.kodeProgram} · ${r.namaProgram} (${r.tahun})`
    : r.namaKegiatan
      ? `${r.kodeKegiatan} · ${r.namaKegiatan}`
      : r.namaSubKegiatan
        ? `${r.kodeSubKegiatan} · ${r.namaSubKegiatan}`
        : r.namaBidang ||
          r.namaSatuan ||
          r.namaKecamatan ||
          r.namaFaskes ||
          r.name;
