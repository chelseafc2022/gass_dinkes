-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Satuan" (
    "id" TEXT NOT NULL,
    "namaSatuan" TEXT NOT NULL,
    "simbol" TEXT,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Satuan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "kodeProgram" TEXT NOT NULL,
    "namaProgram" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "isAksesFaskes" BOOLEAN NOT NULL DEFAULT false,
    "bidangId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kegiatan" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "kodeKegiatan" TEXT NOT NULL,
    "namaKegiatan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubKegiatan" (
    "id" TEXT NOT NULL,
    "kegiatanId" TEXT NOT NULL,
    "kodeSubKegiatan" TEXT NOT NULL,
    "namaSubKegiatan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indikator" (
    "id" TEXT NOT NULL,
    "subKegiatanId" TEXT NOT NULL,
    "namaIndikator" TEXT NOT NULL,
    "satuanId" TEXT NOT NULL,
    "kategoriIndikator" TEXT NOT NULL DEFAULT 'INDIKATOR_PROGRAM',
    "jenisThreshold" TEXT NOT NULL DEFAULT 'PERSENTASE_TARGET',
    "thresholdHijauMin" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "thresholdKuningMin" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "thresholdMerahMax" DOUBLE PRECISION NOT NULL DEFAULT 49.9,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indikator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndikatorBidang" (
    "id" TEXT NOT NULL,
    "indikatorId" TEXT NOT NULL,
    "bidangId" TEXT NOT NULL,

    CONSTRAINT "IndikatorBidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenanggungJawab" (
    "id" TEXT NOT NULL,
    "kodeBidang" TEXT,
    "namaBidang" TEXT NOT NULL,
    "kepalaBidang" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenanggungJawab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kecamatan" (
    "id" TEXT NOT NULL,
    "kodeKecamatan" TEXT NOT NULL,
    "namaKecamatan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faskes" (
    "id" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,
    "namaFaskes" TEXT NOT NULL,
    "jenisFaskes" TEXT NOT NULL DEFAULT 'PUSKESMAS',
    "alamat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faskes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengaturanSistem" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "batasTanggalInput" INTEGER NOT NULL DEFAULT 5,
    "isOtomatisAktif" BOOLEAN NOT NULL DEFAULT false,
    "mulaiOtomatisPeriode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanSistem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodeOverride" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "statusOverride" TEXT NOT NULL,
    "batasKhusus" TIMESTAMP(3),
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapaianKinerja" (
    "id" TEXT NOT NULL,
    "indikatorId" TEXT NOT NULL,
    "faskesId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "targetKinerja" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianJan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianFeb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianMar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianApr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianMei" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianJun" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianJul" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianAgs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianSep" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianOkt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianNov" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaianDes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapaianKinerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapaianKeuangan" (
    "id" TEXT NOT NULL,
    "subKegiatanId" TEXT NOT NULL,
    "faskesId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "targetKeuangan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianJan" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianFeb" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianMar" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianApr" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianMei" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianJun" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianJul" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianAgs" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianSep" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianOkt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianNov" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "capaianDes" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapaianKeuangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "egovId" TEXT,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "jabatan" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR_PUSKESMAS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "faskesId" TEXT,
    "bidangId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "menuKey" TEXT NOT NULL,
    "canAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Satuan_namaSatuan_key" ON "Satuan"("namaSatuan");

-- CreateIndex
CREATE UNIQUE INDEX "Program_kodeProgram_tahun_key" ON "Program"("kodeProgram", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "IndikatorBidang_indikatorId_bidangId_key" ON "IndikatorBidang"("indikatorId", "bidangId");

-- CreateIndex
CREATE UNIQUE INDEX "Kecamatan_kodeKecamatan_key" ON "Kecamatan"("kodeKecamatan");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodeOverride_tahun_bulan_key" ON "PeriodeOverride"("tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "CapaianKinerja_indikatorId_faskesId_tahun_key" ON "CapaianKinerja"("indikatorId", "faskesId", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "CapaianKeuangan_subKegiatanId_faskesId_tahun_key" ON "CapaianKeuangan"("subKegiatanId", "faskesId", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "User_nip_key" ON "User"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "User_egovId_key" ON "User"("egovId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPermission_role_menuKey_key" ON "MenuPermission"("role", "menuKey");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_bidangId_fkey" FOREIGN KEY ("bidangId") REFERENCES "PenanggungJawab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kegiatan" ADD CONSTRAINT "Kegiatan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubKegiatan" ADD CONSTRAINT "SubKegiatan_kegiatanId_fkey" FOREIGN KEY ("kegiatanId") REFERENCES "Kegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indikator" ADD CONSTRAINT "Indikator_subKegiatanId_fkey" FOREIGN KEY ("subKegiatanId") REFERENCES "SubKegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indikator" ADD CONSTRAINT "Indikator_satuanId_fkey" FOREIGN KEY ("satuanId") REFERENCES "Satuan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndikatorBidang" ADD CONSTRAINT "IndikatorBidang_indikatorId_fkey" FOREIGN KEY ("indikatorId") REFERENCES "Indikator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndikatorBidang" ADD CONSTRAINT "IndikatorBidang_bidangId_fkey" FOREIGN KEY ("bidangId") REFERENCES "PenanggungJawab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faskes" ADD CONSTRAINT "Faskes_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "Kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianKinerja" ADD CONSTRAINT "CapaianKinerja_indikatorId_fkey" FOREIGN KEY ("indikatorId") REFERENCES "Indikator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianKinerja" ADD CONSTRAINT "CapaianKinerja_faskesId_fkey" FOREIGN KEY ("faskesId") REFERENCES "Faskes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianKeuangan" ADD CONSTRAINT "CapaianKeuangan_subKegiatanId_fkey" FOREIGN KEY ("subKegiatanId") REFERENCES "SubKegiatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapaianKeuangan" ADD CONSTRAINT "CapaianKeuangan_faskesId_fkey" FOREIGN KEY ("faskesId") REFERENCES "Faskes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_faskesId_fkey" FOREIGN KEY ("faskesId") REFERENCES "Faskes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bidangId_fkey" FOREIGN KEY ("bidangId") REFERENCES "PenanggungJawab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

