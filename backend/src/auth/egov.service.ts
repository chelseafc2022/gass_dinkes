import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createPool, Pool, RowDataPacket } from "mysql2/promise";
import * as bcrypt from "bcrypt";
// All external statements are fixed SELECTs; credentials require SELECT-only privileges.
const FROM = `FROM egov.users u LEFT JOIN simpeg.biodata b ON u.nama_nip=b.nip
 LEFT JOIN simpeg.jabatan j ON b.jabatan=j._id
 LEFT JOIN simpeg.unit_kerja k ON COALESCE(NULLIF(b.unit_kerja,''),u.unit_kerja)=k.id
 LEFT JOIN simpeg.instansi i ON i.id=k.instansi`;
const FIELDS = `u.id AS "egovId",u.username,COALESCE(b.nip,u.nama_nip) AS nip,COALESCE(b.nama,u.username) AS name,
 COALESCE(j.jabatan,b.jenis_jabatan,'Pegawai') AS jabatan,k.unit_kerja AS "unitKerja",i.instansi AS opd`;
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
  private async read(sql: string, params: unknown[]) {
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
  async authenticate(identifier: string, password: string) {
    const rows = await this.read(
      `SELECT ${FIELDS},u.password AS password ${FROM} WHERE u.username=? OR u.nama_nip=? OR b.nip=? OR u.email=? LIMIT 1`,
      Array(4).fill(identifier.trim()),
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
      name: String(r.name),
      jabatan: String(r.jabatan),
      username: String(r.username),
      unitKerja: r.unitKerja,
      opd: r.opd,
    };
  }
  async lookup(q: string) {
    if (q.trim().length < 3) return [];
    return this.read(
      `SELECT ${FIELDS} ${FROM} WHERE b.nip LIKE ? OR b.nama LIKE ? ORDER BY b.nama LIMIT 20`,
      [`%${q.trim()}%`, `%${q.trim()}%`],
    );
  }
  async profile(nip: string) {
    const rows = await this.read(
      `SELECT ${FIELDS} ${FROM} WHERE b.nip=? OR u.nama_nip=? LIMIT 1`,
      [nip, nip],
    );
    if (!rows[0])
      throw new UnauthorizedException(
        "Pegawai tidak ditemukan pada eGov/Simpeg.",
      );
    return rows[0];
  }
  async onModuleDestroy() {
    await this.pool?.end();
  }
}
