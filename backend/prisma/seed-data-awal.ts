import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function seedDataAwal() {
  console.log("=== MEMULAI IMPORT DATA AWAL DARI DESAIN WEB GASS.xlsx ===");

  const jsonPath = path.resolve(
    "/Users/simplephi/.gemini/antigravity-ide/brain/f8a1b894-5090-432f-bd12-0719f372cd9c/scratch/gass_data.json",
  );

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File data JSON tidak ditemukan di ${jsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const { program: programList, indikator: indikatorList } = raw;

  // 1. Ambil Penanggung Jawab (Bidang) dari database
  const bidangs = await db.penanggungJawab.findMany();
  const bidangMap = new Map<string, string>();
  for (const b of bidangs) {
    if (b.kodeBidang) bidangMap.set(b.kodeBidang.toUpperCase(), b.id);
    bidangMap.set(b.namaBidang.toUpperCase(), b.id);
  }
  const defaultKesmasId = bidangMap.get("KESMAS") || bidangs[0]?.id;

  // 2. Ambil Satuan
  const satuans = await db.satuan.findMany();
  const satuanMap = new Map<string, string>();
  for (const s of satuans) {
    satuanMap.set(s.namaSatuan.toLowerCase(), s.id);
  }
  const satuanIbuHamil = satuanMap.get("ibu hamil") || satuans[0]?.id;
  const satuanOrang = satuanMap.get("orang") || satuans[0]?.id;

  // 3. Ambil Faskes
  const allFaskes = await db.faskes.findMany();
  const faskesMap = new Map<string, string>();
  for (const f of allFaskes) {
    const cleanDb = f.namaFaskes
      .replace(/^UPTD PUSKESMAS\s+/i, "")
      .trim()
      .toUpperCase();
    faskesMap.set(cleanDb, f.id);
    faskesMap.set(cleanDb.replace(/\s+/g, ""), f.id);
    faskesMap.set(f.namaFaskes.toUpperCase(), f.id);
  }

  // 4. Import Program, Kegiatan, dan Sub Kegiatan
  let totalProg = 0;
  let totalKeg = 0;
  let totalSub = 0;

  const subKegiatanDbMap = new Map<string, string>(); // namaSubKegiatan -> id

  for (const p of programList) {
    const bidangId = bidangMap.get(p.kodeBidang) || defaultKesmasId;

    const progDb = await db.program.upsert({
      where: {
        kodeProgram_tahun: {
          kodeProgram: p.kodeProgram,
          tahun: 2026,
        },
      },
      create: {
        kodeProgram: p.kodeProgram,
        namaProgram: p.namaProgram,
        tahun: 2026,
        isAksesFaskes: p.isAksesFaskes,
        bidangId,
      },
      update: {
        namaProgram: p.namaProgram,
        isAksesFaskes: p.isAksesFaskes,
        bidangId,
      },
    });
    totalProg++;

    for (const k of p.kegiatan) {
      let kegDb = await db.kegiatan.findFirst({
        where: {
          programId: progDb.id,
          namaKegiatan: k.namaKegiatan,
        },
      });

      if (!kegDb) {
        kegDb = await db.kegiatan.create({
          data: {
            programId: progDb.id,
            kodeKegiatan: k.kodeKegiatan,
            namaKegiatan: k.namaKegiatan,
          },
        });
      } else {
        kegDb = await db.kegiatan.update({
          where: { id: kegDb.id },
          data: {
            kodeKegiatan: k.kodeKegiatan,
            namaKegiatan: k.namaKegiatan,
          },
        });
      }
      totalKeg++;

      for (const s of k.sub_kegiatan) {
        let subDb = await db.subKegiatan.findFirst({
          where: {
            kegiatanId: kegDb.id,
            namaSubKegiatan: s.namaSubKegiatan,
          },
        });

        if (!subDb) {
          subDb = await db.subKegiatan.create({
            data: {
              kegiatanId: kegDb.id,
              kodeSubKegiatan: s.kodeSubKegiatan,
              namaSubKegiatan: s.namaSubKegiatan,
            },
          });
        } else {
          subDb = await db.subKegiatan.update({
            where: { id: subDb.id },
            data: {
              kodeSubKegiatan: s.kodeSubKegiatan,
              namaSubKegiatan: s.namaSubKegiatan,
            },
          });
        }
        totalSub++;
        subKegiatanDbMap.set(s.namaSubKegiatan.trim().toUpperCase(), subDb.id);
      }
    }
  }

  console.log(
    `✓ Berhasil import ${totalProg} Program, ${totalKeg} Kegiatan, ${totalSub} Sub Kegiatan (Tahun 2026).`,
  );

  // 5. Import Indikator dan Capaian Kinerja Faskes
  let totalIndikator = 0;
  let totalCapaianInserted = 0;

  for (const ind of indikatorList) {
    const subId = subKegiatanDbMap.get(ind.namaSubKegiatan.trim().toUpperCase());
    if (!subId) {
      console.warn(
        `Sub kegiatan ${ind.namaSubKegiatan} tidak ditemukan di database!`,
      );
      continue;
    }

    const satuanId = ind.namaIndikator.toLowerCase().includes("ibu hamil")
      ? satuanIbuHamil
      : satuanOrang;

    let indDb = await db.indikator.findFirst({
      where: {
        subKegiatanId: subId,
        namaIndikator: ind.namaIndikator,
      },
    });

    if (!indDb) {
      indDb = await db.indikator.create({
        data: {
          subKegiatanId: subId,
          namaIndikator: ind.namaIndikator,
          satuanId,
          kategoriIndikator: ind.kategoriIndikator || "SPM",
          jenisThreshold: "PERSENTASE_TARGET",
          thresholdHijauMin: 80.0,
          thresholdKuningMin: 50.0,
          thresholdMerahMax: 49.9,
        },
      });
    } else {
      indDb = await db.indikator.update({
        where: { id: indDb.id },
        data: {
          satuanId,
          kategoriIndikator: ind.kategoriIndikator || "SPM",
        },
      });
    }
    totalIndikator++;

    // Relasi Indikator ke Bidang Kesmas
    if (defaultKesmasId) {
      await db.indikatorBidang.upsert({
        where: {
          indikatorId_bidangId: {
            indikatorId: indDb.id,
            bidangId: defaultKesmasId,
          },
        },
        create: {
          indikatorId: indDb.id,
          bidangId: defaultKesmasId,
        },
        update: {},
      });
    }

    // Insert / update Capaian Kinerja per Faskes
    for (const fItem of ind.faskesData) {
      const raw = fItem.namaFaskesRaw;
      const clean = raw
        .replace(/^PKM\s+/i, "")
        .trim()
        .toUpperCase();
      const faskesId =
        faskesMap.get(clean) ||
        faskesMap.get(clean.replace(/\s+/g, "")) ||
        faskesMap.get(raw.toUpperCase());

      if (!faskesId) {
        console.warn(`Faskes ${raw} tidak ditemukan di database!`);
        continue;
      }

      const cb = fItem.capaianBulan;
      await db.capaianKinerja.upsert({
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
          targetKinerja: fItem.targetKinerja,
          capaianJan: cb[0] ?? 0,
          capaianFeb: cb[1] ?? 0,
          capaianMar: cb[2] ?? 0,
          capaianApr: cb[3] ?? 0,
          capaianMei: cb[4] ?? 0,
          capaianJun: cb[5] ?? 0,
          capaianJul: cb[6] ?? 0,
          capaianAgs: cb[7] ?? 0,
          capaianSep: cb[8] ?? 0,
          capaianOkt: cb[9] ?? 0,
          capaianNov: cb[10] ?? 0,
          capaianDes: cb[11] ?? 0,
          isValidated: false,
          verifikasiBulanan: {
            create: cb.flatMap((nilai, index) => nilai !== 0 ? [{ bulan: index + 1, submittedAt: new Date() }] : []),
          },
        },
        update: {
          isValidated: false,
          verifikasiBulanan: {
            deleteMany: {},
            create: cb.flatMap((nilai, index) => nilai !== 0 ? [{ bulan: index + 1, submittedAt: new Date() }] : []),
          },
          targetKinerja: fItem.targetKinerja,
          capaianJan: cb[0] ?? 0,
          capaianFeb: cb[1] ?? 0,
          capaianMar: cb[2] ?? 0,
          capaianApr: cb[3] ?? 0,
          capaianMei: cb[4] ?? 0,
          capaianJun: cb[5] ?? 0,
          capaianJul: cb[6] ?? 0,
          capaianAgs: cb[7] ?? 0,
          capaianSep: cb[8] ?? 0,
          capaianOkt: cb[9] ?? 0,
          capaianNov: cb[10] ?? 0,
          capaianDes: cb[11] ?? 0,
        },
      });
      totalCapaianInserted++;
    }
  }

  console.log(
    `✓ Berhasil import ${totalIndikator} Indikator SPM Utama dan ${totalCapaianInserted} data Capaian Kinerja Faskes (2026).`,
  );
  console.log("=== IMPORT DATA AWAL SELESAI DENGAN SUKSES ===");
}

if (process.argv[1]?.includes("seed-data-awal")) {
  seedDataAwal()
    .catch((e) => {
      console.error("Gagal import data awal:", e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
