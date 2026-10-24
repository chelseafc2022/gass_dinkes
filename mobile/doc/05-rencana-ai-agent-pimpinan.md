# Rencana AI Agent untuk Dashboard Pimpinan

Status: **rencana pengembangan**, 24 Oktober 2026. MVP chat AI sudah diimplementasikan setelah dokumen ini disusun. Lihat [06 — Implementasi AI Agent](06-implementasi-ai-agent.md) untuk fitur aktual, perbedaan dari rencana, konfigurasi, dan hasil pengujian. Detail di bawah tetap merupakan rancangan, bukan klaim seluruh fitur sudah tersedia.

## 1. Tujuan dan kelayakan

**Bisa diterapkan:** pimpinan cukup bertanya dalam bahasa Indonesia untuk mengetahui kinerja, target, realisasi, capaian, dan prioritas tindak lanjut. AI Agent menjadi pintu masuk percakapan ke data GASS, dengan dashboard tetap tersedia untuk memeriksa rincian.

Contoh pertanyaan:

- “Bagaimana kinerja sampai September tahun ini?”
- “Berapa target dan realisasi indikator ini?”
- “Puskesmas mana yang capaiannya paling rendah pada triwulan III?”
- “Bandingkan capaian triwulan II dan III.”
- “Berapa serapan anggaran program ini?”
- “Mana yang perlu saya tindak lanjuti?”

AI memahami maksud pertanyaan dan menjelaskan hasil. Backend GASS mengambil data, menghitung angka, dan menentukan hak akses. Jawaban faktual wajib memiliki sumber; model tidak menjadi sumber angka resmi.

## 2. Fondasi yang tersedia

| Komponen saat ini | Pemanfaatan dalam rencana |
| --- | --- |
| [ExecutiveDashboard.tsx](../src/features/dashboard/ExecutiveDashboard.tsx) | Titik masuk chat dari dashboard pimpinan dan pembukaan rincian sumber |
| [ReportsController](../../backend/src/reports/reports.controller.ts) | Endpoint dashboard dan laporan yang sudah dilindungi kontrol akses |
| [ReportsService](../../backend/src/reports/reports.service.ts) | Logika target, realisasi terverifikasi, persentase, peringkat, tren, dan keuangan |
| [Policy backend](../../backend/src/common/policy.ts) | Dasar pembatasan pengguna, faskes, dan bidang |

Dashboard mobile saat ini membaca `/dashboard` melalui transport API aplikasi. Backend menghitung realisasi terverifikasi dan juga menyediakan `realisasiGross` pada ringkasan laporan. Nilai bruto tidak boleh disebut sebagai capaian resmi terverifikasi. API yang ada masih mengambil seluruh data sesuai filter; tool AI perlu proyeksi/agregasi terbatas agar tidak mengirim seluruh laporan ke model.

## 3. Lingkup tahap pertama

Chat teks untuk akun pimpinan yang berwenang, dengan kemampuan baca:

| Kemampuan | Hasil yang diharapkan |
| --- | --- |
| Ringkasan kinerja | Ringkasan capaian sesuai periode dan cakupan akses |
| Target dan realisasi | Nilai, satuan, persentase, selisih terhadap target, dan status verifikasi |
| Perbandingan | Dua periode atau beberapa faskes untuk indikator yang sebanding |
| Prioritas | Daftar indikator/faskes tertinggal beserta alasan berbasis data |
| Keuangan | Pagu/target, realisasi terverifikasi, dan serapan per program |
| Pertanyaan lanjutan | “Yang paling rendah?”, “Rinci per puskesmas” dengan konteks percakapan |

Tahap pertama tidak mengubah target, menyimpan laporan, memverifikasi capaian, atau mengirim instruksi ke pegawai. Analisis penyebab hanya diberikan jika tersedia bukti; capaian rendah saja tidak membuktikan penyebabnya. Saran tindak lanjut diberi label sebagai saran untuk ditinjau pimpinan.

## 4. Alur percakapan dan tampilan mobile

1. Pimpinan membuka **Tanya AI** di dashboard setelah login dengan sesi GASS yang tersedia.
2. Layar menampilkan contoh pertanyaan dan konteks aktif: tahun, periode, serta cakupan data.
3. Backend mengidentifikasi indikator/program/faskes. Jika nama ambigu, agent meminta pilihan sebelum mengambil kesimpulan.
4. Jika periode tidak disebutkan, gunakan filter dashboard aktif dan tampilkan asumsi tersebut. Frasa “tahun ini” mengikuti waktu server dengan zona Asia/Makassar.
5. Tool mengambil data yang diizinkan. Agent menampilkan ringkasan, kartu angka, sumber, dan tombol **Lihat rincian**.
6. Pertanyaan lanjutan mempertahankan filter yang terlihat; perubahan cakupan tetap diperiksa server pada setiap permintaan.

Format jawaban wajib: periode dan jenis agregasi, cakupan faskes/indikator, target beserta satuan, realisasi terverifikasi, persentase, status, sumber, dan waktu pengambilan data. Tampilkan waktu pembaruan data hanya jika tersedia dari sumber; waktu pengambilan bukan waktu pembaruan laporan.

Contoh format, **bukan data resmi**: “Indikator A, Januari–September 2026: realisasi terverifikasi 750 dari target tahunan 1.000 layanan (75%). Selisih terhadap target tahunan 250 layanan. Sumber: rincian indikator A dengan filter periode tersebut.” Status warna mengikuti threshold server, bukan penilaian model.

UI mengikuti palet emerald/teal/mint GASS, dengan status berupa teks selain warna. Sediakan keadaan memuat, batal, gagal, sesi berakhir, dan tidak ada data. Saat offline, jelaskan bahwa jawaban baru memerlukan koneksi. Bersihkan percakapan/cache lokal ketika logout atau berganti akun; hindari penyimpanan riwayat permanen di perangkat untuk MVP.

## 5. Arsitektur usulan

```text
Chat mobile
  → API chat backend: sesi, izin, validasi, rate limit
  → Orkestrator AI: memahami pertanyaan dan memilih tool
  → Tool baca yang diizinkan: validasi argumen dan lingkup akses
  → Service agregasi GASS → Prisma → PostgreSQL
  → Hasil terstruktur + referensi sumber
  → Narasi AI + kartu angka dari backend → Chat mobile
```

Model hanya memanggil fungsi yang sudah ditentukan. Model tidak menerima kredensial database, tidak menjalankan SQL bebas, dan tidak mengakses endpoint mutasi. Kartu angka dirender dari hasil backend; narasi diperiksa terhadap hasil tool. Jika narasi memuat angka atau sumber yang tidak didukung, gunakan ringkasan deterministik dari backend.

Pemilihan penyedia/model belum ditetapkan. Sebelum integrasi, evaluasi akurasi bahasa Indonesia, pemanggilan tool terstruktur, latensi, biaya per percakapan, retensi data, dan kebijakan pemrosesan data instansi. Kredensial penyedia disimpan sebagai secret backend, bukan dalam aplikasi atau `EXPO_PUBLIC_*`.

### Kontrak awal yang diusulkan

Endpoint baru: `POST /api/ai/chat` (belum tersedia).

- Request: `message`, `conversationId` opsional, `requestId`, dan `context` berisi filter dashboard. Role dan cakupan izin berasal dari sesi server, bukan body.
- Response: `answer`, `facts`, `sources`, `resolvedContext`, `retrievedAt`, `warnings`, dan `requestId`.
- `facts` memuat metrik terstruktur dan satuannya; `sources` memuat ID sumber serta filter yang dapat dibuka melalui navigasi internal yang diizinkan.
- Percakapan disimpan sementara di server dengan pemilik dan TTL; setiap akses ulang memeriksa kepemilikan dan izin terkini. ID percakapan bukan bukti otorisasi.
- Batas awal yang akan diuji: pesan 2.000 karakter, konteks 10 giliran terakhir, maksimal 4 pemanggilan tool per pertanyaan, maksimal 20 baris rincian per hasil, dan 10 permintaan/menit/akun. Hasil terpotong wajib diberi penanda.
- Timeout awal 20 detik agar selaras dengan transport mobile; jika tidak cukup, evaluasi kontrak streaming secara terpisah. Batasi anggaran token, konkurensi, dan biaya harian; jangan melakukan retry tanpa batas.

| Tool usulan | Fungsi |
| --- | --- |
| `getPerformanceSummary` | Ringkasan kinerja berdasarkan tahun, periode, dan cakupan |
| `getIndicatorAchievement` | Target, realisasi, satuan, status, dan rincian indikator |
| `comparePerformance` | Perbandingan dua periode atau faskes dengan definisi metrik sama |
| `getPriorityFacilities` | Peringkat dengan dasar capaian dan kelengkapan laporan |
| `getBudgetRealization` | Target/pagu dan realisasi keuangan per program |

Semua tool memakai schema argumen ketat, filter yang diizinkan, dan service otorisasi backend. Jangan meneruskan hasil laporan mentah ke model; kirim hanya agregat yang diperlukan.

## 6. Aturan kebenaran data

- Gunakan rumus dan aturan periode yang sama dengan dashboard. Kinerja kumulatif sampai bulan/triwulan harus disebut kumulatif; jangan menyebutnya realisasi bulan tunggal. Periode keuangan mengikuti logika backend yang berlaku.
- Target tahunan tidak boleh disebut target bulanan. Target periodik hanya digunakan jika datanya tersedia; jangan membagi target tahunan secara otomatis.
- Hitung persentase dan selisih di backend. Jika target nol/tidak tersedia, beri keterangan bahwa persentase tidak dapat diinterpretasikan; jangan menyatakan target tercapai hanya karena pembagian nol menghasilkan nilai bawaan.
- Jangan menjumlahkan indikator dengan satuan berbeda atau merata-ratakan persentase tanpa definisi metrik. Ringkasan capaian harus menjelaskan basis agregasinya.
- Bedakan belum melapor, laporan nihil, belum terverifikasi, dan realisasi terverifikasi nol. Peringkat prioritas harus menyertakan kelengkapan data agar tidak menyamakan belum melapor dengan kinerja buruk.
- Perbandingan triwulan kumulatif diberi label jelas; kenaikan persentase dilaporkan sebagai poin persentase. Jangan menganggap selisih kumulatif sebagai realisasi triwulan tanpa memastikan basis data sebanding.
- Pertanyaan “mengapa turun?” dijawab dengan temuan terukur dan batas bukti. Jika alasan operasional tidak tercatat, katakan belum tersedia dan sarankan konfirmasi.
- Jika data kosong, akses ditolak, atau tool gagal, jangan menghasilkan angka perkiraan. Tampilkan pesan aman dan opsi membuka dashboard.

## 7. Keamanan dan operasional

- Pertahankan autentikasi GASS dan cookie HttpOnly, Secure, SameSite sesuai konfigurasi server. Terapkan izin dashboard serta batas faskes/bidang di endpoint chat dan setiap tool.
- Perlakukan pertanyaan, nama indikator, dan teks sumber sebagai data tidak tepercaya. Instruksi seperti “abaikan aturan” tidak dapat memperluas tool atau cakupan akses.
- Batasi data yang keluar ke penyedia pada agregat yang diperlukan. Jangan mengirim cookie, password, identitas pasien, atau kredensial. Tinjau kebijakan data instansi sebelum mengaktifkan penyedia eksternal.
- Lindungi endpoint dengan validasi, rate limit, batas ukuran payload, dan error tersanitasi. Render respons sebagai teks/komponen aman; tautan sumber harus dibentuk aplikasi dari referensi tervalidasi.
- Audit mencatat akun, waktu, tool, filter, referensi sumber, durasi, penggunaan token, dan hasil akses. Hindari log isi percakapan mentah secara default. Retensi, akses, dan penghapusan riwayat/audit harus ditetapkan sebelum pilot.
- Pisahkan cache berdasarkan akun, cakupan izin, filter, serta versi data; periksa izin ulang pada setiap giliran. Jangan membagikan jawaban cache lintas pengguna tanpa evaluasi otorisasi.
- Sediakan feature flag, batas biaya, dan tombol penghentian fitur. Ketika AI tidak tersedia, dashboard tetap bisa dipakai.

## 8. Tahapan implementasi

| Tahap | Pekerjaan | Syarat selesai |
| --- | --- | --- |
| 1 — Definisi data | Sepakati pertanyaan utama, rumus, periode, threshold, akses, dan kebijakan penyedia | Kamus metrik dan contoh jawaban disetujui pemilik data |
| 2 — Tool backend | Ekstraksi/reuse agregasi dashboard, schema, sumber, otorisasi, dan batas payload | Hasil tool cocok dengan dashboard untuk fixture yang sama |
| 3 — Orkestrasi AI | Endpoint chat, konteks percakapan, pemanggilan tool, validasi narasi, audit dan anggaran | Pertanyaan uji terjawab dengan sumber; kegagalan menghasilkan fallback aman |
| 4 — Chat mobile | Tombol Tanya AI, chat, kartu fakta, filter, sumber, error dan pembersihan sesi | Alur utama lulus pengujian Android/iOS dan aksesibilitas |
| 5 — Pilot pimpinan | Aktifkan untuk akun terbatas, uji pertanyaan nyata, ukur kualitas/latensi/biaya | Pemilik data menerima hasil dan temuan akses/data telah diselesaikan |
| 6 — Peluncuran bertahap | Monitoring, dokumentasi penggunaan, penanggung jawab dan rollback | Feature flag serta prosedur penghentian teruji |

Tim yang dibutuhkan: backend, mobile, pengelola data Dinkes, penguji, dan peninjau keamanan. Estimasi waktu dan anggaran ditentukan setelah inventaris metrik, penyedia, dan volume penggunaan disepakati; dokumen ini tidak menetapkan komitmen biaya.

## 9. Kriteria penerimaan

1. Minimal 30 pertanyaan representatif memiliki hasil acuan, meliputi kinerja, target, realisasi, keuangan, perbandingan, dan konteks lanjutan.
2. Seluruh angka, satuan, periode, dan sumber pada kasus uji cocok dengan perhitungan backend; jawaban tanpa bukti tidak ditampilkan sebagai fakta.
3. Uji target nol, belum melapor, nihil, belum terverifikasi, data kosong, nama ambigu, pergantian tahun, dan perbedaan agregasi bulanan/kumulatif lulus.
4. Uji akses lintas akun/faskes/bidang, ID percakapan pengguna lain, sesi berakhir, prompt injection, dan percobaan mutasi tidak membocorkan atau mengubah data.
5. Timeout, penyedia gagal, rate limit, batas biaya, logout, dan perubahan hak akses menghasilkan perilaku aman; dashboard tetap tersedia.
6. Ukur latensi p50/p95, biaya per pertanyaan, kegagalan tool, dan ketepatan sumber saat pilot. Target awal p95 di bawah 15 detik, untuk divalidasi dengan beban nyata sebelum dijadikan SLA.
7. Lint, typecheck, tes kontrak/tool, tes integrasi otorisasi, dan uji perangkat dilaksanakan sebelum fitur dinyatakan siap rilis.

Pengembangan lanjutan dapat mencakup ringkasan rapat dan pencarian pedoman resmi dengan kutipan dokumen. Fitur suara, prediksi, notifikasi proaktif, serta tindakan tulis memerlukan rancangan dan evaluasi terpisah.
