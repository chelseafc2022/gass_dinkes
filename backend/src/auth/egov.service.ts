import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createPool, Pool, RowDataPacket } from "mysql2/promise";
import * as bcrypt from "bcrypt";

export const DINKES_INSTANSI_ID = "tuwRgWDzmfad28n8Z";

export interface PegawaiDirectoryItem {
  egovId: string | null;
  username: string;
  nip: string;
  nama: string;
  namaLengkap: string;
  gelarDepan?: string;
  gelarBelakang?: string;
  jabatan: string;
  unitKerja: string;
  unitKerjaId?: string | null;
  opd: string;
  instansiId?: string | null;
}

// All external statements are fixed SELECTs; credentials require SELECT-only privileges.
const FROM = `FROM simpeg.biodata b
 LEFT JOIN egov.users u ON u.nama_nip = b.nip
 LEFT JOIN simpeg.jabatan j ON b.jabatan = j._id
 LEFT JOIN simpeg.unit_kerja k ON COALESCE(NULLIF(b.unit_kerja, ''), u.unit_kerja) = k.id
 LEFT JOIN simpeg.instansi i ON i.id = k.instansi`;

const FIELDS = `u.id AS "egovId",
 COALESCE(u.username, TRIM(REPLACE(b.nip, ' ', ''))) AS username,
 TRIM(REPLACE(COALESCE(NULLIF(b.nip, ''), u.nama_nip), ' ', '')) AS nip,
 COALESCE(b.nama, u.username) AS name,
 b.gelar_depan AS "gelarDepan",
 b.gelar_belakang AS "gelarBelakang",
 COALESCE(j.jabatan, b.jenis_jabatan, 'Pegawai') AS jabatan,
 k.id AS "unitKerjaId",
 COALESCE(k.unit_kerja, 'Dinas Kesehatan') AS "unitKerja",
 i.id AS "instansiId",
 COALESCE(i.instansi, 'DINAS KESEHATAN') AS opd`;

@Injectable()
export class EgovService implements OnModuleDestroy {
  private pool?: Pool;

  private connection() {
    if (
      !process.env.EGOV_DB_HOST ||
      !process.env.EGOV_DB_USER ||
      !process.env.EGOV_DB_PASSWORD
    )
      throw new ServiceUnavailableException(
        "Koneksi eGov/Simpeg belum dikonfigurasi.",
      );
    return (this.pool ??= createPool({
      host: process.env.EGOV_DB_HOST,
      port: Number(process.env.EGOV_DB_PORT || 3306),
      user: process.env.EGOV_DB_USER,
      password: process.env.EGOV_DB_PASSWORD,
      connectionLimit: 5,
      connectTimeout: 8000,
      multipleStatements: false,
    }));
  }

  private async read(sql: string, params: unknown[] = []) {
    try {
      const [rows] = await this.connection().query<RowDataPacket[]>(
        sql,
        params,
      );
      return rows;
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      throw new ServiceUnavailableException(
        "Layanan eGov/Simpeg sedang tidak tersedia.",
      );
    }
  }

  formatNamaLengkap(r: {
    nama?: string;
    name?: string;
    gelarDepan?: string;
    gelarBelakang?: string;
    gelar_depan?: string;
    gelar_belakang?: string;
  }): string {
    const rawNama = (r.nama || r.name || "").trim().replace(/^[-,\s]+|[-,\s]+$/g, "");
    const gDepan = (r.gelarDepan || r.gelar_depan || "").trim();
    const gBelakang = (r.gelarBelakang || r.gelar_belakang || "").trim();

    const prefix = gDepan && gDepan !== "-" ? `${gDepan} ` : "";
    const suffix = gBelakang && gBelakang !== "-" ? `, ${gBelakang}` : "";
    return `${prefix}${rawNama}${suffix}`.trim();
  }

  async authenticate(identifier: string, password: string) {
    const cleanId = identifier.trim();
    const cleanNip = cleanId.replace(/\s+/g, "");
    const rows = await this.read(
      `SELECT ${FIELDS}, u.password AS password 
       FROM egov.users u 
       LEFT JOIN simpeg.biodata b ON u.nama_nip = b.nip
       LEFT JOIN simpeg.jabatan j ON b.jabatan = j._id
       LEFT JOIN simpeg.unit_kerja k ON COALESCE(NULLIF(b.unit_kerja, ''), u.unit_kerja) = k.id
       LEFT JOIN simpeg.instansi i ON i.id = k.instansi
       WHERE u.username = ? OR u.nama_nip = ? OR b.nip = ? OR u.email = ? OR REPLACE(b.nip, ' ', '') = ?
       LIMIT 1`,
      [cleanId, cleanId, cleanId, cleanId, cleanNip],
    );
    const r = rows[0];
    if (
      !r ||
      !r.password ||
      !(await bcrypt.compare(
        password,
        String(r.password).replace(/^\$2y\$/, "$2b$"),
      ))
    )
      throw new UnauthorizedException("NIP/username atau kata sandi salah.");

    return {
      egovId: String(r.egovId),
      nip: String(r.nip),
      name: this.formatNamaLengkap(r as any),
      jabatan: String(r.jabatan),
      username: String(r.username),
      unitKerja: r.unitKerja,
      unitKerjaId: r.unitKerjaId,
      opd: r.opd,
      instansiId: r.instansiId,
    };
  }

  async getInstansiList() {
    const rows = await this.read(
      `SELECT id, instansi FROM simpeg.instansi WHERE id = ? OR instansi LIKE '%KESEHATAN%' ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, instansi ASC`,
      [DINKES_INSTANSI_ID, DINKES_INSTANSI_ID],
    );
    return rows.map((r) => ({
      id: String(r.id),
      instansi: String(r.instansi),
    }));
  }

  async getUnitKerjaList(instansiId = DINKES_INSTANSI_ID) {
    const targetInstansi = instansiId && instansiId !== "all" ? instansiId : DINKES_INSTANSI_ID;
    const rows = await this.read(
      `SELECT id, unit_kerja AS unitKerja, instansi AS instansiId 
       FROM simpeg.unit_kerja 
       WHERE instansi = ? 
       ORDER BY unit_kerja ASC`,
      [targetInstansi],
    );
    return rows.map((r) => ({
      id: String(r.id),
      unitKerja: String(r.unitKerja),
      instansiId: String(r.instansiId),
    }));
  }

  async getDirectory(params: {
    page?: number;
    limit?: number;
    search?: string;
    instansiId?: string;
    unitKerjaId?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [
      "b.nip IS NOT NULL",
      "TRIM(b.nip) != ''",
      "b.nama IS NOT NULL",
    ];
    const queryParams: unknown[] = [];

    // Filter instansi: default Dinas Kesehatan
    const instansi = params.instansiId ?? DINKES_INSTANSI_ID;
    if (instansi && instansi !== "all") {
      whereClauses.push("i.id = ?");
      queryParams.push(instansi);
    }

    // Filter sub unit kerja (Puskesmas / bidang / dinas induk)
    if (params.unitKerjaId && params.unitKerjaId !== "all") {
      whereClauses.push("k.id = ?");
      queryParams.push(params.unitKerjaId);
    }

    // Filter search NIP atau Nama atau Jabatan
    if (params.search && params.search.trim() !== "") {
      const q = `%${params.search.trim()}%`;
      const cleanQ = `%${params.search.trim().replace(/\s+/g, "")}%`;
      whereClauses.push(
        "(b.nip LIKE ? OR REPLACE(b.nip, ' ', '') LIKE ? OR b.nama LIKE ? OR u.username LIKE ? OR j.jabatan LIKE ?)",
      );
      queryParams.push(q, cleanQ, q, q, q);
    }

    const whereStr = whereClauses.join(" AND ");

    const countSql = `SELECT COUNT(DISTINCT b.nip) AS total ${FROM} WHERE ${whereStr}`;
    const countRows = await this.read(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataSql = `
      SELECT ${FIELDS}
      ${FROM}
      WHERE ${whereStr}
      GROUP BY b.nip
      ORDER BY 
        CASE 
          WHEN j.jabatan LIKE '%KEPALA DINAS%' THEN 0
          WHEN j.jabatan LIKE '%SEKRETARIS%' THEN 1
          WHEN j.jabatan LIKE '%KEPALA PUSKESMAS%' THEN 2
          ELSE 99
        END ASC,
        b.nama ASC
      LIMIT ?, ?
    `;

    const dataRows = await this.read(dataSql, [...queryParams, offset, limit]);

    const data: PegawaiDirectoryItem[] = dataRows.map((r) => ({
      egovId: r.egovId ? String(r.egovId) : null,
      username: String(r.username),
      nip: String(r.nip),
      nama: String(r.name),
      namaLengkap: this.formatNamaLengkap(r as any),
      gelarDepan: r.gelarDepan ? String(r.gelarDepan) : undefined,
      gelarBelakang: r.gelarBelakang ? String(r.gelarBelakang) : undefined,
      jabatan: String(r.jabatan),
      unitKerja: String(r.unitKerja),
      unitKerjaId: r.unitKerjaId ? String(r.unitKerjaId) : null,
      opd: String(r.opd),
      instansiId: r.instansiId ? String(r.instansiId) : null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUsernamesByNips(nips: string[]): Promise<Map<string, string>> {
    if (!nips || nips.length === 0) return new Map();
    const cleanNips = Array.from(
      new Set(nips.map((n) => String(n).trim().replace(/\s+/g, "")).filter(Boolean)),
    );
    if (cleanNips.length === 0) return new Map();

    const placeholders = cleanNips.map(() => "?").join(",");
    try {
      const rows = await this.read(
        `SELECT 
          TRIM(REPLACE(u.nama_nip, ' ', '')) AS uNip,
          TRIM(REPLACE(b.nip, ' ', '')) AS bNip,
          u.username
         FROM egov.users u
         LEFT JOIN simpeg.biodata b ON u.nama_nip = b.nip
         WHERE TRIM(REPLACE(u.nama_nip, ' ', '')) IN (${placeholders})
            OR TRIM(REPLACE(b.nip, ' ', '')) IN (${placeholders})`,
        [...cleanNips, ...cleanNips],
      );

      const map = new Map<string, string>();
      for (const r of rows) {
        if (r.username) {
          if (r.uNip) map.set(String(r.uNip), String(r.username));
          if (r.bNip) map.set(String(r.bNip), String(r.username));
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  async countPegawaiDinkes(): Promise<number> {
    const rows = await this.read(
      `SELECT COUNT(DISTINCT b.nip) AS total ${FROM} WHERE b.nip IS NOT NULL AND TRIM(b.nip) != '' AND i.id = ?`,
      [DINKES_INSTANSI_ID],
    );
    return Number(rows[0]?.total || 0);
  }

  async getKecamatanKonsel() {
    // 7405 adalah kode/id Kabupaten Konawe Selatan di egov.master_kecamatan
    const rows = await this.read(
      `SELECT 
        kecamatan_id AS "kecamatanId",
        kabupaten_id AS "kabupatenId",
        kode_kecamatan AS "kodeKecamatan",
        nama_kecamatan AS "namaKecamatan"
       FROM egov.master_kecamatan
       WHERE kabupaten_id = ?
       ORDER BY nama_kecamatan ASC`,
      [7405],
    );

    return rows.map((r: any) => {
      const nama = String(r.namaKecamatan || "").trim();
      const idStr = String(r.kecamatanId);
      const kode = r.kodeKecamatan ? String(r.kodeKecamatan).trim() : idStr;
      return {
        kecamatanId: idStr,
        kodeKecamatan: kode,
        namaKecamatan: nama,
      };
    });
  }

  async getFaskesFromSimpeg() {
    // Ambil semua sub unit kerja di bawah Dinas Kesehatan yang bukan dinas induk
    const rows = await this.read(
      `SELECT 
        id,
        unit_kerja AS "namaUnitKerja",
        alamat
       FROM simpeg.unit_kerja
       WHERE instansi = ? AND unit_kerja != 'DINAS KESEHATAN'
       ORDER BY unit_kerja ASC`,
      [DINKES_INSTANSI_ID],
    );

    // Pemetaan nama puskesmas / rumah sakit yang menggunakan nama desa ke nama kecamatan di Konawe Selatan
    const desaKecMap: Record<string, string> = {
      "ATARI JAYA": "LALEMBUU",
      "ANDOOLO UTAMA": "BUKE",
      "BIMA MAROA": "ANDOOLO BARAT",
      "AMONDO": "PALANGGA SELATAN",
      "PAMANDATI": "LAINEA",
      "PUNGGALUKU": "LAEYA",
      "TUMBU-TUMBU JAYA": "KOLONO TIMUR",
      "TAMBOLOSU": "LAONTI",
      "LALOWARU": "MORAMO UTARA",
      "LAMEURU": "RANOMEETO BARAT",
      "MOTAHA": "ANGATA",
      "BLUD RSU KONAWE SELATAN": "ANDOOLO",
      "RUMAH SAKIT UMUM DAERAH": "ANDOOLO",
    };

    return rows.map((r: any) => {
      const rawName = String(r.namaUnitKerja || "").trim();
      const cleanName = rawName.replace(/^UPTD PUSKESMAS\s+/i, "").trim().toUpperCase();
      const upperRaw = rawName.toUpperCase();

      const targetKecamatan =
        desaKecMap[cleanName] || desaKecMap[upperRaw] || cleanName;

      const isRS =
        upperRaw.includes("RUMAH SAKIT") ||
        upperRaw.includes("RSUD") ||
        upperRaw.includes("RSU");

      return {
        simpegId: String(r.id),
        namaFaskes: rawName,
        jenisFaskes: isRS ? "RUMAH_SAKIT" : "PUSKESMAS",
        targetKecamatanNama: targetKecamatan,
        alamat:
          r.alamat && r.alamat.trim() !== "-" && r.alamat.trim() !== ""
            ? String(r.alamat).trim()
            : null,
      };
    });
  }

  async getBidangDanSekretariatDinkes() {
    const rows = await this.read(
      `SELECT 
        j._id AS "jabatanId",
        j.jabatan AS "namaJabatan",
        b.nip,
        b.nama,
        b.gelar_depan AS "gelarDepan",
        b.gelar_belakang AS "gelarBelakang",
        k.unit_kerja AS "unitKerja"
      FROM simpeg.biodata b
      JOIN simpeg.jabatan j ON b.jabatan = j._id
      JOIN simpeg.unit_kerja k ON b.unit_kerja = k.id
      WHERE k.instansi = ? AND k.unit_kerja = 'DINAS KESEHATAN'
        AND (
          j.jabatan LIKE '%SEKRETARIS DINAS%'
          OR j.jabatan LIKE '%KEPALA BIDANG%'
        )
      ORDER BY 
        CASE 
          WHEN j.jabatan LIKE '%SEKRETARIS%' THEN 0
          WHEN j.jabatan LIKE '%KESEHATAN MASYARAKAT%' THEN 1
          WHEN j.jabatan LIKE '%PENCEGAHAN%' THEN 2
          WHEN j.jabatan LIKE '%PELAYANAN KESEHATAN%' THEN 3
          WHEN j.jabatan LIKE '%FARMASI%' THEN 4
          ELSE 9
        END ASC`,
      [DINKES_INSTANSI_ID],
    );

    return rows.map((r: any) => {
      const jabatanStr = String(r.namaJabatan || "");
      const { kode, nama } = this.formatNamaBidang(jabatanStr);
      const namaLengkap = this.formatNamaLengkap(r);
      const cleanNip = String(r.nip || "").replace(/\s+/g, "");

      return {
        jabatanId: String(r.jabatanId),
        jabatanSimpeg: jabatanStr,
        kodeBidang: kode,
        namaBidang: nama,
        kepalaBidang: cleanNip ? `${namaLengkap} (NIP: ${cleanNip})` : namaLengkap,
        pejabatNama: namaLengkap,
        pejabatNip: cleanNip,
      };
    });
  }

  private formatNamaBidang(jabatan: string): { kode: string; nama: string } {
    const upper = jabatan.toUpperCase().trim();
    if (upper.includes("SEKRETARIS")) {
      return { kode: "SEKR", nama: "Sekretariat" };
    }
    if (upper.includes("KESEHATAN MASYARAKAT")) {
      return { kode: "KESMAS", nama: "Bidang Kesehatan Masyarakat" };
    }
    if (upper.includes("PENCEGAHAN") || upper.includes("P2P")) {
      return { kode: "P2P", nama: "Bidang Pencegahan dan Pengendalian Penyakit" };
    }
    if (upper.includes("PELAYANAN KESEHATAN") || upper.includes("YANKES")) {
      return { kode: "YANKES", nama: "Bidang Pelayanan Kesehatan" };
    }
    if (upper.includes("FARMASI") || upper.includes("ALAT KESEHATAN")) {
      return { kode: "FARMALKES", nama: "Bidang Farmasi dan Alat Kesehatan" };
    }
    const clean = upper
      .replace(/^KEPALA\s+BIDANG\s+/, "Bidang ")
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    const words = clean.split(/\s+/).slice(1);
    const code = (words.map((w) => w[0]).join("") || "BDG").toUpperCase();
    return { kode: code, nama: clean };
  }

  async lookup(q: string, instansiId = DINKES_INSTANSI_ID) {
    if (q.trim().length < 3) return [];
    const term = `%${q.trim()}%`;
    const cleanTerm = `%${q.trim().replace(/\s+/g, "")}%`;

    const whereClauses = [
      "b.nip IS NOT NULL",
      "TRIM(b.nip) != ''",
      "(b.nip LIKE ? OR REPLACE(b.nip, ' ', '') LIKE ? OR b.nama LIKE ? OR u.username LIKE ?)",
    ];
    const params: unknown[] = [term, cleanTerm, term, term];

    if (instansiId && instansiId !== "all") {
      whereClauses.push("i.id = ?");
      params.push(instansiId);
    }

    const rows = await this.read(
      `SELECT ${FIELDS} ${FROM} WHERE ${whereClauses.join(" AND ")} ORDER BY b.nama LIMIT 20`,
      params,
    );
    return rows.map((r) => ({
      egovId: r.egovId ? String(r.egovId) : null,
      username: String(r.username),
      nip: String(r.nip),
      name: this.formatNamaLengkap(r as any),
      jabatan: String(r.jabatan),
      unitKerja: String(r.unitKerja),
      unitKerjaId: r.unitKerjaId ? String(r.unitKerjaId) : null,
      opd: String(r.opd),
      instansiId: r.instansiId ? String(r.instansiId) : null,
    }));
  }

  async profile(nip: string) {
    const cleanNip = nip.trim().replace(/\s+/g, "");
    const rows = await this.read(
      `SELECT ${FIELDS} ${FROM} WHERE REPLACE(b.nip, ' ', '') = ? OR u.nama_nip = ? OR u.username = ? LIMIT 1`,
      [cleanNip, cleanNip, cleanNip],
    );
    if (!rows[0])
      throw new UnauthorizedException(
        "Pegawai tidak ditemukan pada eGov/Simpeg.",
      );
    const r = rows[0];
    return {
      egovId: r.egovId ? String(r.egovId) : null,
      username: String(r.username),
      nip: String(r.nip),
      name: this.formatNamaLengkap(r as any),
      jabatan: String(r.jabatan),
      unitKerja: String(r.unitKerja),
      unitKerjaId: r.unitKerjaId ? String(r.unitKerjaId) : null,
      opd: String(r.opd),
      instansiId: r.instansiId ? String(r.instansiId) : null,
    };
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
