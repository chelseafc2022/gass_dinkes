import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface FaskesData {
  rawName: string;
  namaFaskes: string;
  target: number;
  realisasi: number;
  persentase: number;
}

interface SpmRecord {
  spmIndex: number;
  col: number;
  namaIndikator: string;
  kodeSubKegiatan: string;
  satuan: string;
  bidang: string[];
  faskesData: FaskesData[];
}

function distributeRealisasi(rel: number): number[] {
  const months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (rel <= 0) return months;

  const base = Math.floor(rel / 6);
  let remainder = Math.round(rel - base * 6);

  for (let m = 0; m < 6; m++) {
    months[m] = base;
  }
  for (let m = 0; m < remainder; m++) {
    months[m] += 1;
  }

  // Adjust any rounding discrepancy in month 6 (June)
  const sum6 = months.slice(0, 6).reduce((a, b) => a + b, 0);
  const diff = Number((rel - sum6).toFixed(2));
  months[5] = Number((months[5] + diff).toFixed(2));

  return months;
}

export async function importSpmData() {
  console.log("=== MEMULAI IMPORT DATA 12 SPM DARI EXCEL KAB. KONAWE SELATAN ===");

  const jsonPath = path.resolve(__dirname, "spm_2026_data.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File ${jsonPath} tidak ditemukan! Jalankan python extraction terlebih dahulu.`);
  }

  const spmList: SpmRecord[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // 1. Ambil Satuan
  const allSatuan = await db.satuan.findMany();
  const satuanMap = new Map<string, string>();
  for (const s of allSatuan) {
    satuanMap.set(s.namaSatuan.toLowerCase(), s.id);
  }
  const defaultSatuanId = satuanMap.get("orang") || allSatuan[0].id;

  // 2. Ambil Bidang
  const allBidang = await db.penanggungJawab.findMany();
  const bidangMap = new Map<string, string>();
  for (const b of allBidang) {
    if (b.kodeBidang) bidangMap.set(b.kodeBidang.toUpperCase(), b.id);
    bidangMap.set(b.namaBidang.toUpperCase(), b.id);
  }

  // 3. Ambil SubKegiatan
  const allSub = await db.subKegiatan.findMany();
  const subMap = new Map<string, string>();
  for (const s of allSub) {
    subMap.set(s.kodeSubKegiatan, s.id);
  }

  // 4. Ambil Faskes
  const allFaskes = await db.faskes.findMany();
  const faskesMap = new Map<string, string>();
  for (const f of allFaskes) {
    faskesMap.set(f.namaFaskes.toUpperCase(), f.id);
  }

  console.log(`Loaded ${allFaskes.length} faskes, ${allSub.length} subkegiatan, ${allBidang.length} bidang.`);

  const updateTimestamp = new Date("2026-07-17T12:00:00Z"); // Sesuai update resmi di sheet Excel

  for (const spm of spmList) {
    const subKegiatanId = subMap.get(spm.kodeSubKegiatan);
    if (!subKegiatanId) {
      throw new Error(`SubKegiatan ${spm.kodeSubKegiatan} tidak ditemukan di database!`);
    }

    const satuanId = satuanMap.get(spm.satuan.toLowerCase()) || defaultSatuanId;

    // Cari indikator SPM yang ada di subkegiatan ini atau buat baru
    let indDb = await db.indikator.findFirst({
      where: {
        subKegiatanId,
        kategoriIndikator: "SPM",
      },
    });

    if (!indDb) {
      indDb = await db.indikator.create({
        data: {
          subKegiatanId,
          namaIndikator: spm.namaIndikator,
          satuanId,
          kategoriIndikator: "SPM",
          jenisThreshold: "PERSENTASE_TARGET",
          thresholdHijauMin: 80.0,
          thresholdKuningMin: 50.0,
          thresholdMerahMax: 49.9,
        },
      });
      console.log(`[CREATE] Indikator SPM ${spm.spmIndex}: ${spm.namaIndikator}`);
    } else {
      indDb = await db.indikator.update({
        where: { id: indDb.id },
        data: {
          namaIndikator: spm.namaIndikator,
          satuanId,
          kategoriIndikator: "SPM",
        },
      });
      console.log(`[UPDATE] Indikator SPM ${spm.spmIndex}: ${spm.namaIndikator}`);
    }

    // Hubungkan ke Bidang Penanggung Jawab
    // Pertama bersihkan relasi lama yang tidak relevan untuk indikator ini
    const targetBidangIds = spm.bidang.map((b) => bidangMap.get(b.toUpperCase())!).filter(Boolean);
    await db.indikatorBidang.deleteMany({
      where: {
        indikatorId: indDb.id,
        bidangId: { notIn: targetBidangIds },
      },
    });

    for (const bidangId of targetBidangIds) {
      await db.indikatorBidang.upsert({
        where: {
          indikatorId_bidangId: {
            indikatorId: indDb.id,
            bidangId,
          },
        },
        create: {
          indikatorId: indDb.id,
          bidangId,
        },
        update: {},
      });
    }

    // Ingest data faskes untuk tahun 2026
    let spmTotalTarget = 0;
    let spmTotalRealisasi = 0;

    for (const f of spm.faskesData) {
      const faskesId = faskesMap.get(f.namaFaskes.toUpperCase());
      if (!faskesId) {
        throw new Error(`Faskes ${f.namaFaskes} tidak ditemukan di database!`);
      }

      spmTotalTarget += f.target;
      spmTotalRealisasi += f.realisasi;

      const mValues = distributeRealisasi(f.realisasi);

      const capaian = await db.capaianKinerja.upsert({
        where: {
          indikatorId_faskesId_tahun: {
            indikatorId: indDb.id,
            faskesId,
            tahun: 2026,
          },
        },
        create: {
          indikatorId: indDb.id,
          faskesId,
          tahun: 2026,
          targetKinerja: f.target,
          capaianJan: mValues[0],
          capaianFeb: mValues[1],
          capaianMar: mValues[2],
          capaianApr: mValues[3],
          capaianMei: mValues[4],
          capaianJun: mValues[5],
          capaianJul: mValues[6],
          capaianAgs: mValues[7],
          capaianSep: mValues[8],
          capaianOkt: mValues[9],
          capaianNov: mValues[10],
          capaianDes: mValues[11],
          isValidated: true,
        },
        update: {
          targetKinerja: f.target,
          capaianJan: mValues[0],
          capaianFeb: mValues[1],
          capaianMar: mValues[2],
          capaianApr: mValues[3],
          capaianMei: mValues[4],
          capaianJun: mValues[5],
          capaianJul: mValues[6],
          capaianAgs: mValues[7],
          capaianSep: mValues[8],
          capaianOkt: mValues[9],
          capaianNov: mValues[10],
          capaianDes: mValues[11],
          isValidated: true,
        },
      });

      // Sinkronkan VerifikasiKinerjaBulanan untuk 6 bulan pertama (Jan-Jun)
      await db.verifikasiKinerjaBulanan.deleteMany({
        where: { capaianId: capaian.id },
      });

      const verifData: any[] = [];
      for (let m = 1; m <= 6; m++) {
        verifData.push({
          capaianId: capaian.id,
          bulan: m,
          submittedAt: updateTimestamp,
          isValidated: true,
          verifiedAt: updateTimestamp,
          legacyVerification: false,
        });
      }
      await db.verifikasiKinerjaBulanan.createMany({
        data: verifData,
      });
    }

    const pct = spmTotalTarget > 0 ? (spmTotalRealisasi / spmTotalTarget) * 100 : 0;
    console.log(
      `  -> Total Kab: Target=${spmTotalTarget.toFixed(0)}, Realisasi=${spmTotalRealisasi.toFixed(0)}, Capaian=${pct.toFixed(2)}% (${spm.bidang.join(" & ")})`
    );
  }

  console.log("\n=== IMPORT 12 SPM BERHASIL SEMPURNA ===");
}

if (require.main === module) {
  importSpmData()
    .catch((err) => {
      console.error("Import failed:", err);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
