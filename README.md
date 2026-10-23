# GASS — Gerakan Aksi Sehat Setara

Aplikasi monitoring kinerja puskesmas dan bidang Dinas Kesehatan, berdasarkan `workflow_GASS_Gerakan_Aksi_Sehat_Setara.md`.

Implementasi ada di `backend/` dan `frontend/`. `nest-simple-auth/` tetap menjadi referensi asli. Proyek Simantap dan template di folder lain tidak diubah.

## Teknologi

- Backend: NestJS 11, PostgreSQL, Prisma 7 dengan adapter `pg`, Redis, BullMQ, Nodemailer.
- Frontend: Next.js 16 App Router, React 19, Tailwind 4, komponen template shadcn, TanStack Query/Table, Recharts.
- Pengalaman pengguna: tema terang/gelap, pengaturan warna dan sidebar, pencarian menu `Ctrl/⌘ K`, pencarian data dengan debounce, tabel sortir/paginasi master, dialog, toast, ekspor CSV, tampilan mobile.
- Autentikasi: identitas eGov/Simpeg, access JWT dalam cookie HttpOnly, refresh token acak dengan rotasi atomik dan hash SHA-256 di database. Password eGov tidak disimpan di GASS.

## Modul

| Halaman | Implementasi |
| --- | --- |
| Dashboard | Filter tahun, triwulan, bulan, faskes, bidang; kartu SPM; ranking dari capaian rendah; grafik faskes; tren SPM/IKU; pagu vs realisasi per program; CSV |
| Master | Satuan, program, kegiatan, sub kegiatan, indikator dengan multi-bidang, threshold triwulan global, kecamatan, faskes, bidang |
| Capaian kinerja | Target tahunan, input 12 bulan, status threshold, koreksi, verifikasi per bulan, CSV |
| Capaian keuangan | Pagu sub kegiatan, realisasi 12 bulan, Rupiah, serapan, verifikasi per bulan, CSV |
| Jadwal | Batas tanggal bulan berikutnya, pembukaan/penutupan khusus, deadline WITA, pra-launching, periode mulai otomatis |
| Pengguna | Pencarian pegawai eGov/Simpeg, penetapan peran/faskes/bidang lokal, aktivasi/nonaktivasi |
| Otoritas | Matriks checkbox tersimpan langsung; batas keamanan peran tetap berlaku |
| Audit | Perubahan master, laporan, verifikasi, jadwal, pengguna, dan otoritas |

Dashboard membaca data PostgreSQL. Tidak ada angka contoh yang ditampilkan sebagai data resmi. Seed awal hanya membuat pengaturan, otoritas, satuan, dan opsional admin pertama. Program, 12 indikator SPM, indikator IKU, wilayah, serta daftar faskes diisi dari data resmi instansi.

## Menjalankan lokal

Prasyarat: Node.js 22.12+ (diuji dengan Node 24), PostgreSQL 16+, Redis 7+. Docker Compose tersedia untuk PostgreSQL dan Redis; bisa juga menggunakan layanan lokal sendiri.

Dari root proyek:

```sh
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Lengkapi `backend/.env`:

- `DATABASE_URL`: database **lokal GASS**, bukan eGov/Simpeg.
- `JWT_ACCESS_SECRET`: nilai acak minimal 32 karakter; buat dengan `openssl rand -hex 32`.
- `FRONTEND_URL`: origin frontend, default `http://localhost:3000`.
- `EGOV_DB_HOST`, `EGOV_DB_PORT`, `EGOV_DB_USER`, `EGOV_DB_PASSWORD`: koneksi eksternal dengan hak **SELECT saja**.
- `BOOTSTRAP_ADMIN_NIP`: NIP pegawai eGov/Simpeg yang akan menjadi Admin Dinkes pertama.
- `BOOTSTRAP_ADMIN_NAME`: nama awal; diperbarui dari identitas eksternal saat login.
- `REDIS_URL`: koneksi Redis untuk antrean email. Boleh dikosongkan saat pengembangan tanpa antrean.

Backend:

```sh
cd backend
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Frontend, pada terminal lain:

```sh
cd frontend
npm ci
npm run dev
```

Buka `http://localhost:3000`. API berjalan di `http://127.0.0.1:3001/api`, dokumentasi development di `http://127.0.0.1:3001/docs`.

Frontend menggunakan proxy Next.js `/api` ke `API_INTERNAL_URL` sehingga cookie tetap same-origin. Saat build untuk deployment, set `API_INTERNAL_URL` ke alamat backend yang benar sebelum `npm run build`.

## Integrasi eGov/Simpeg

Referensi Simantap menggunakan MySQL read-only dengan join `egov.users`, `simpeg.biodata`, `simpeg.jabatan`, `simpeg.unit_kerja`, dan `simpeg.instansi`; tidak ditemukan kontrak REST terpisah pada service autentikasi referensi. Adapter GASS mengikuti pola tersebut di `backend/src/auth/egov.service.ts`.

- Login menerima NIP, username, atau email yang terdaftar di eGov.
- Hash password diverifikasi dengan bcrypt, termasuk prefix PHP `$2y$`.
- Pegawai hanya dapat masuk setelah mendapat akses aktif di database GASS. Tidak ada registrasi publik atau penentuan role otomatis dari nama jabatan.
- Lookup pegawai dan autentikasi eksternal hanya menjalankan query `SELECT` terparameterisasi.
- Tidak ada credential eksternal dari proyek referensi yang disalin ke sumber GASS.
- Pengujian tidak menghubungi server eGov/Simpeg asli. Verifikasi login terhadap layanan asli memerlukan konfigurasi koneksi dan akun yang sah.

Jika instansi menyediakan endpoint REST resmi, ubah adapter `EgovService` sesuai kontrak resmi tersebut; modul otorisasi dan laporan tidak perlu diubah.

## Aturan yang ditegakkan oleh API

- Operator hanya dapat membaca/mengubah laporan milik `user.faskesId`; permintaan faskes berbeda ditolak. Master tidak dapat diakses walaupun URL diketik langsung.
- Akun bidang hanya mengubah program/kegiatan/sub kegiatan milik bidangnya. Laporan teknis dibatasi relasi multi-bidang indikator; keuangan dibatasi sub kegiatan yang memiliki indikator binaannya.
- Operator hanya mendapat sub kegiatan keuangan dengan `Program.isAksesFaskes = true`.
- Kepala Dinas hanya membaca dashboard dan laporan, tanpa mutasi.
- Matriks dapat mengurangi akses menu, tetapi tidak dapat meniadakan batas faskes/bidang atau memberi operator akses master. Akses admin sendiri tidak dapat dihapus lewat matriks.
- Pengubahan peran/penugasan menutup sesi pengguna; status akun dan sesi juga diperiksa pada setiap request.
- Verifikasi dilakukan per bulan oleh Admin Dinkes atau akun bidang yang menjadi penanggung jawab indikator. Untuk keuangan, bidang harus terkait dengan indikator pada sub kegiatan. Faskes dan Kepala Dinas tidak dapat memverifikasi. Bulan terverifikasi terkunci bagi faskes; bulan lain tetap mengikuti jadwal input masing-masing.
- Koreksi realisasi oleh admin/bidang membatalkan verifikasi hanya pada bulan yang dikoreksi. Perubahan target tahunan membatalkan verifikasi seluruh bulan; operator tidak dapat mengubah target jika ada bulan terverifikasi atau periode tertutup. Menyimpan ulang nilai yang sama mempertahankan verifikasinya.
- Input bulanan memiliki catatan tersendiri sehingga realisasi nol yang sengaja disimpan dapat diverifikasi, sedangkan bulan belum diinput tidak bisa diverifikasi. Pemeriksa, waktu, bulan, nilai, target, dan pembatalan tercatat dalam audit. Verifikasi menolak nilai/target yang berubah sejak dimuat oleh pemeriksa; transaksi serializable melindungi benturan koreksi dan verifikasi.
- Migrasi `20261019110000_monthly_verification` mempertahankan verifikasi tahunan lama hanya pada bulan bernilai nonnol, ditandai sebagai verifikasi warisan tanpa mengarang nama/tanggal pemeriksa. Nilai nol lama belum dapat dibedakan dari bulan kosong dan perlu disimpan ulang jika memang merupakan laporan nihil. Kolom `isValidated` tahunan dipertahankan untuk preservasi, tetapi penguncian dan ringkasan dashboard memakai catatan bulanan.
- Record keuangan disimpan sebagai `Decimal(18,2)`; angka pada grafik diserialisasi menjadi number.
- Master yang sedang digunakan tidak dapat dihapus karena foreign key `Restrict`.
- Mutasi dan audit laporan/master/administrasi disimpan dalam transaksi database.

### Jadwal dan perhitungan

1. Override `TUTUP` selalu menutup periode, termasuk saat pra-launching.
2. Override `BUKA` membuka periode sampai `batasKhusus` jika diisi, atau tanpa batas jika kosong.
3. Tanpa override, `isOtomatisAktif=false` membuka seluruh periode.
4. `mulaiOtomatisPeriode` menggunakan format `YYYY-MM`; periode sebelumnya tetap terbuka.
5. Deadline otomatis adalah tanggal yang dipilih pada bulan berikutnya, pukul 23:59:59.999 **Asia/Makassar (UTC+8)**, termasuk pergantian Desember ke Januari. Tanggal global dibatasi 1–28; deadline lain menggunakan override.
6. Admin/bidang dapat mengoreksi tanpa batas periode. Kepala Dinas tetap tidak dapat menulis.

Capaian kinerja menjumlahkan realisasi **kumulatif sejak Januari** sampai akhir triwulan/bulan yang dipilih dan membaginya dengan target tahunan. Tanpa filter periode, perhitungan mencakup Januari–Desember dan memakai aturan TW IV. Filter bulan memakai aturan triwulan yang memuat bulan tersebut. Target nol menghasilkan 0% dan status merah. Grafik tren juga menampilkan capaian kumulatif sampai akhir setiap triwulan. Ringkasan kinerja adalah rata-rata persentase laporan dengan target positif, sehingga satuan berbeda tidak dijumlahkan sebagai satu target. Ranking menyertakan faskes yang belum melaporkan dengan penanda "Belum melaporkan".

Admin Dinkes mengelola empat aturan global melalui **Data Master → Threshold triwulan** (`/master/threshold`). Aturan awal: hijau ≥100% untuk semua triwulan; kuning TW I 25%–<100%, TW II 50%–<100%, TW III 75%–<100%; TW IV tanpa kuning, merah <100%. Jika kuning dinonaktifkan, seluruh capaian di bawah batas hijau berstatus merah. Semua indikator dan tahun laporan memakai master yang sama. Penyimpanan empat aturan beserta audit berlangsung dalam satu transaksi; role lain tidak dapat diberi akses pengelolaan melalui matriks otoritas. Kolom threshold lama pada indikator dipertahankan untuk preservasi data, tetapi tidak lagi digunakan untuk penilaian atau diedit melalui API/form indikator.

Keuangan tetap menjumlahkan bulan dalam periode yang dipilih dengan ambang serapan 80%/50%. Migrasi `20261019090000_global_quarter_threshold` menambahkan tabel master dan empat aturan awal tanpa menghapus data lama; jalankan migrasi dan regenerasi Prisma sebelum menjalankan backend versi ini.

## Redis, BullMQ, email

`NotificationsService` menyediakan antrean `gass-email`, worker, retry eksponensial, dan transport SMTP. Isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, serta autentikasi SMTP jika diperlukan.

`enqueue(to, subject, text)` tersedia untuk workflow pemberitahuan yang nantinya ditetapkan instansi. Saat ini tidak ada pengiriman email atau reminder terjadwal otomatis; workflow tidak menetapkan pemicu dan penerimanya. SMTP asli tidak dipakai dalam pengujian.

## Pemeriksaan

```sh
cd backend
npm run typecheck
npm test
npm run build

cd ../frontend
npm run typecheck
npm run lint
npm run build
```

`npm test` menjalankan unit test aturan periode/scoping; integration test dilewati jika `TEST_DATABASE_URL` belum diisi. Untuk pengujian PostgreSQL, gunakan **database khusus uji** yang namanya mengandung `gass_test`, jalankan migrasi ke database tersebut, kemudian:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:PORT/gass_test' npm test
```

Tes integrasi menggunakan mock identitas eksternal dan data fiktif. Jangan arahkan ke database operasional. Skenario meliputi CRUD/audit, isolasi faskes, program keuangan terbatas, kewenangan bidang, Kadis read-only, deadline/override, verifikasi, presisi uang, RBAC, cookie HttpOnly, rotasi token, dan pencabutan akses.

Tes UI ada di `frontend/tests/gass.spec.ts` dengan Chrome lokal (`npx playwright test`). Tes login dapat berjalan tanpa akun; tes berotorisasi menggunakan `GASS_BROWSER_SESSIONS` yang menunjuk file sesi dari `backend/scripts/browser-sessions.cjs`. Script ini hanya menerima database `gass_test`, memerlukan build backend, dan menghasilkan token pengguna fiktif berumur satu jam. Backend/browser harus memakai `JWT_ACCESS_SECRET` yang sama. Default URL tes adalah `http://127.0.0.1:3100`; dapat diganti melalui `GASS_TEST_BASE_URL`.

## Produksi

Gunakan database GASS tersendiri, backup PostgreSQL, origin eksplisit, secret acak, dan HTTPS di reverse proxy. Set `NODE_ENV=production` agar cookie memakai `Secure`. API mendengarkan localhost; gunakan reverse proxy lokal atau sesuaikan binding sesuai infrastruktur deployment. Swagger dinonaktifkan pada production.

Jalankan migrasi dengan `npm run db:migrate` sebelum menyalakan rilis. Tidak ada perubahan, migrasi, atau sinkronisasi tulis ke database eGov/Simpeg. Browser memerlukan header `X-Gass-Client: web` untuk mutasi; wrapper frontend sudah memasangnya dan server memvalidasi origin.

## Referensi

- [Workflow GASS](workflow_GASS_Gerakan_Aksi_Sehat_Setara.md)
- [Lisensi template shadcn](frontend/TEMPLATE-LICENSE.md)
- [Prisma PostgreSQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [NestJS queues / BullMQ](https://docs.nestjs.com/techniques/queues)

## Aplikasi mobile

Project React Native Android/iOS tersedia di [`mobile/`](mobile/README.md): input bulanan, draf terenkripsi, verifikasi per bulan, dan dashboard sesuai role. Panduan konfigurasi API HTTPS, development build, hasil pemeriksaan, dan batas kesiapan rilis tersedia di README mobile.
