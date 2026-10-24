# Implementasi AI Agent Pimpinan

Status 24 Oktober 2026: **MVP backend dan mobile sudah diimplementasikan**. Integrasi penyedia tersedia di kode, tetapi belum diaktifkan di lingkungan lokal: `OPENAI_API_KEY` dan `OPENAI_MODEL` belum diisi. Tidak ada panggilan berbayar ke model atau pengiriman data instansi selama pengembangan/pengujian ini.

**Penerapan ditunda atas permintaan pengguna.** Tombol **Tanya AI** dan import navigasinya di `ExecutiveDashboard.tsx` sementara dikomentari, sehingga tombol tidak muncul di dashboard mobile. Kode chat, route terproteksi, backend, dan rencana tetap dipertahankan untuk dipelajari serta dilanjutkan kemudian. Alur penggunaan di bawah berlaku setelah tombol diaktifkan kembali dan konfigurasi server dilengkapi.

Dokumen ini menjelaskan implementasi aktual. [Dokumen 05](05-rencana-ai-agent-pimpinan.md) tetap menjadi rencana pengembangan yang lebih luas.

## 1. Alur penggunaan

1. Kepala Dinas login menggunakan akun GASS yang sudah ada dan membuka dashboard.
2. Pilih bulan/triwulan, lalu tekan **Tanya AI • Kinerja, target & realisasi**. Filter dibawa ke chat.
3. Ajukan pertanyaan, misalnya “Bagaimana kinerja pada periode ini?”, “Berapa realisasi anggaran?”, atau “Berapa target dan realisasi [nama indikator] sampai September 2026?”. Gunakan nama indikator/program yang tersedia di GASS.
4. Server memeriksa sesi, role Kepala Dinas, dan izin dashboard. Akun admin/operator/bidang tidak memperoleh akses chat ini hanya dengan mengubah request atau membuka route langsung.
5. Redis memeriksa batas penggunaan. Backend mengirim pertanyaan dan konteks filter ke OpenAI Responses API. Data laporan, cookie, token login, dan kredensial database tidak disertakan.
6. Model mengusulkan satu pemanggilan fungsi `read_gass`: jenis pertanyaan, metrik, periode, nama indikator/program, faskes, periode pembanding, dan batas hasil. Zod memvalidasi seluruh parameter; fungsi tulis/SQL tidak tersedia.
7. Backend memeriksa izin kembali, lalu memakai `ReportsService.list` untuk membaca data sesuai aturan GASS. Nama ambigu memunculkan permintaan nama lengkap; nama tidak ditemukan tidak diperluas menjadi semua data.
8. Backend menghitung jawaban dan kartu angka secara deterministik: target tahunan, realisasi terverifikasi, persentase, selisih, status, dan kelengkapan bulan-laporan. Model tidak menulis narasi angka akhir.
9. Chat menampilkan hasil, cakupan/periode, peringatan kelengkapan, dan waktu pengambilan WITA. **Lihat sumber data terbaru** membaca ulang agregat dari server tanpa memanggil model; nilainya bisa berubah setelah laporan diperbarui.
10. Pertanyaan berikutnya membawa konteks terakhir. **Percakapan baru** menghapus riwayat layar dan mengembalikan filter awal. Keluar layar membuang state lokal; logout/pergantian akun juga memutus akses dan membuang state.

```text
Pimpinan → Chat mobile → API GASS → pemeriksaan sesi/izin + kuota Redis
                                       ↓
                            OpenAI: pahami pertanyaan
                                       ↓
                            read_gass + validasi Zod
                                       ↓
                        ReportsService → Prisma → PostgreSQL
                                       ↓
                      Perhitungan + narasi backend + audit metadata
                                       ↓
                         Kartu jawaban dan sumber di mobile
```

## 2. Kemampuan yang tersedia

| Pertanyaan | Perilaku |
| --- | --- |
| Ringkasan kinerja | Rincian indikator serta rata-rata capaian baris laporan bertarget positif, sesuai basis ringkasan dashboard |
| Target/realisasi indikator | Nilai agregat, satuan, target tahunan, selisih target dikurangi realisasi, threshold, dan kelengkapan |
| Prioritas puskesmas | Urutan persentase terendah untuk satu indikator; faskes tanpa laporan disebut terpisah dan tidak dianggap memiliki realisasi nihil |
| Keuangan | Total seluruh program dan rincian per program, atau satu program yang disebut |
| Perbandingan periode | Satu indikator atau keuangan untuk dua periode; perubahan realisasi dan poin persentase, dengan peringatan bila target berubah |
| Filter faskes | Satu nama faskes atau seluruh faskes; nama ambigu diminta diperjelas |
| Pertanyaan lanjutan | Mempertahankan jenis data, nama indikator/program, faskes dan periode dari konteks terakhir |

Kinerja menggunakan kumulatif Januari sampai bulan/akhir triwulan. Keuangan menggunakan bulan/triwulan yang dipilih, mengikuti backend. Target tetap tahunan. Target nol menghasilkan persentase kosong dan keterangan yang jelas. Nilai belum terverifikasi tidak masuk realisasi resmi.

## 3. Teknologi dan pemasangan

**Tidak ada dependency npm baru, migrasi database, atau layanan baru yang dipasang pada perubahan ini.** Redis, PostgreSQL, dan library berikut sudah menjadi bagian proyek. Tidak memerlukan GPU, model lokal, vector database, LangChain, atau SDK AI di HP.

| Teknologi | Lokasi dan fungsi |
| --- | --- |
| Expo / React Native / TypeScript | Layar chat Android/iOS, mengikuti SDK proyek |
| Expo Router | Route `ai-chat`, proteksi route, dan pengiriman filter dari dashboard |
| TanStack Query | Pemeriksaan status layanan AI; state percakapan disimpan di memori React |
| Lucide dan komponen UI proyek | Ikon, tombol, kartu, dan tema emerald/teal/mint |
| NestJS | Endpoint status, chat, dan pembacaan sumber |
| Zod | Schema input chat, rencana fungsi, dan respons mobile |
| OpenAI Responses API | Pemahaman bahasa Indonesia melalui satu function call dengan schema ketat; model dipilih lewat `OPENAI_MODEL` |
| `fetch` bawaan Node.js | HTTP ke penyedia; tidak menambah paket `openai` |
| Prisma / PostgreSQL | Data dan aturan laporan yang ada serta audit metadata pada `AuditLog` |
| `ioredis` / Redis | Kuota atomik lintas proses backend, dengan masa kedaluwarsa |
| `@nestjs/throttler` | Pembatas tambahan request HTTP per IP |
| Jest / Supertest / Node test runner | Tes domain, provider, HTTP/auth, kuota, dan kontrak mobile |

Pada checkout baru, pasang dependency yang sudah ada:

```sh
# Dari root GASS
cd backend
npm ci
cd ../mobile
npm ci
```

Referensi integrasi: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [Expo Router SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/). Model yang dikonfigurasi harus mendukung Responses API dan function calling dengan schema ketat; ketersediaannya harus diuji pada project API instansi.

## 4. Aktivasi

Konfigurasi **backend saja**, melalui secret environment deployment atau `backend/.env` lokal yang tidak di-commit:

```dotenv
AI_ENABLED=true
OPENAI_API_KEY=
OPENAI_MODEL=
AI_DAILY_REQUEST_LIMIT=200
```

Isi API key dari project API yang dikelola instansi dan ID model yang tersedia untuk project tersebut. Pastikan `REDIS_URL`, `DATABASE_URL`, dan konfigurasi autentikasi GASS yang sudah ada berfungsi. Jangan menyalin key ke `mobile/.env`, variabel `EXPO_PUBLIC_*`, source code, log, atau percakapan chat.

Setelah konfigurasi lengkap, restart backend sesuai pengelola proses yang digunakan. Untuk lokal:

```sh
# Di backend
npm run build
npm run start:prod

# Di mobile, terminal terpisah
npm start
```

Gunakan akun Kepala Dinas untuk memeriksa status layanan, mengirim pertanyaan, lalu membandingkan jawaban dengan dashboard memakai filter sama. Status `enabled` memeriksa keberadaan konfigurasi; bukan bukti API key valid atau Redis/provider sedang sehat. Kesalahan penyedia atau Redis menghasilkan pesan layanan tidak tersedia. Mobile tetap menggunakan `EXPO_PUBLIC_API_URL` yang sudah ada, tanpa konfigurasi AI tambahan.

Untuk mematikan panggilan AI: set `AI_ENABLED=false` dan restart backend. Dashboard serta pembacaan sumber terotorisasi tetap tersedia. Fitur belum dipublikasikan ke perangkat atau server produksi oleh perubahan ini.

## 5. Endpoint dan berkas

| Endpoint | Kontrak |
| --- | --- |
| `GET /api/ai/status` | `{ enabled }`, khusus Kepala Dinas dengan izin dashboard |
| `POST /api/ai/chat` | Body `{ message, context }`; hasil berisi `enabled`, `answer`, `facts`, `warnings`, `resolvedContext`, `source`, `retrievedAt`, `requestId` |
| `POST /api/ai/facts` | Body berupa rencana/filter tervalidasi; membaca ulang sumber tanpa model |

Semua response memakai `Cache-Control: no-store`. Autentikasi dan header kompatibilitas `X-Gass-Client: web` mengikuti transport yang sudah ada; header ini bukan pengganti sesi atau role. Tidak ada endpoint mutasi laporan pada modul AI.

- [Kontrak backend](../../backend/src/ai/ai.contract.ts), [provider](../../backend/src/ai/ai.provider.ts), [service data](../../backend/src/ai/ai.service.ts), [kuota](../../backend/src/ai/ai.budget.ts), [controller](../../backend/src/ai/ai.controller.ts).
- [Layar chat](../src/features/ai/AiChat.tsx), [kontrak mobile](../src/features/ai/contract.ts), [route](../src/app/ai-chat.tsx).
- [Contoh environment](../../backend/.env.example).

## 6. Batas penggunaan dan data

- Pesan maksimal 2.000 karakter. Konteks hanya berupa filter/rencana terakhir; tidak ada riwayat percakapan di database atau riwayat penuh yang dikirim ke model. Layar menyimpan maksimal 10 pasangan tanya-jawab dalam memori.
- Satu panggilan model per pertanyaan, maksimal 1.200 output token, timeout penyedia 12 detik, transport mobile 20 detik. Tidak ada retry penyedia otomatis. Pembatalan di mobile menghentikan penantian; proses yang sudah diterima server dapat tetap selesai dan terhitung dalam kuota.
- Maksimal 10 permintaan model/menit/akun dan, secara default, 200 permintaan/hari seluruh pengguna, berdasarkan hari WITA. Kuota dicatat atomik di Redis dan tetap dihitung ketika penyedia gagal. HTTP chat dan facts masing-masing dibatasi 20 request/menit/IP. Tidak ada pembatas konkurensi global terpisah pada MVP.
- Kuota permintaan membatasi volume, bukan batas tagihan rupiah/dolar. Biaya bergantung model dan token; pengelola perlu memasang batas pengeluaran pada project penyedia dan memantau penggunaan sebelum pilot.
- Hasil maksimal 20 baris per periode; perbandingan dapat menampilkan dua periode. Hasil terpotong diberi keterangan. Target nol dipisahkan dari penilaian persentase.
- Pertanyaan dan konteks dikirim ke penyedia dengan `store: false`. Pengaturan tersebut bukan klaim tanpa retensi di seluruh sistem penyedia; kebijakan pemrosesan data instansi tetap perlu diterapkan sebelum aktivasi.
- Audit menyimpan akun, request ID, jenis fungsi, periode, ID sumber, token, durasi, dan hasil. Tidak menyimpan teks pertanyaan, jawaban lengkap, atau secret. Retensi mengikuti pengelolaan tabel audit yang sudah ada; modul ini belum menambah tugas penghapusan audit.

## 7. Pengujian dan batas kesiapan

Hasil pengembangan:

- Backend: **108 tes lulus**, termasuk pengujian HTTP dengan guard autentikasi dan kuota serentak pada Redis sementara. **25 tes integrasi PostgreSQL dilewati** karena `TEST_DATABASE_URL` tidak tersedia.
- Mobile: **11 tes lulus**, termasuk kontrak AI dan transport sesi yang sudah ada.
- Typecheck backend/mobile dan build backend berhasil. Lint tanpa error; terdapat 1 warning lama backend dan 4 warning lama mobile.
- Bundle Android/iOS diperiksa melalui Expo export; ini bukan APK/IPA signed atau pengujian pada perangkat fisik.

Tes provider memakai respons tiruan. Belum ada validasi langsung model, uji kualitas 30 pertanyaan bahasa alami dengan penyedia nyata, pengukuran p95/biaya, pentest, atau uji keyboard/accessibility pada HP. API key/model lokal belum diisi, sehingga fitur saat ini menampilkan status belum aktif sampai dikonfigurasi.

Tes rutin:

```sh
# backend
npm run typecheck
npm run lint
npm test
npm run build

# mobile
npm run typecheck
npm run lint
npm test
npm run export:android
npm exec expo export -- --platform ios --output-dir dist-ios
```

Pengujian HTTP memerlukan izin membuka socket lokal. Tes kuota Redis nyata aktif jika `AI_TEST_REDIS_SOCKET` menunjuk socket Unix Redis **khusus pengujian**; tanpa itu, satu tes kuota integrasi dilewati. Jangan gunakan Redis produksi untuk tes. Uji integrasi database mengikuti aturan `TEST_DATABASE_URL` proyek.

Untuk volume besar, service laporan saat ini masih memuat seluruh baris sesuai tahun/periode di server. Hanya hasil terpilih yang dikirim ke mobile, dan tidak ada laporan yang dikirim ke model. Agregasi/pagination database khusus AI tetap diperlukan sebelum klaim kapasitas skala besar.

Perbandingan langsung beberapa faskes, target bulanan yang tidak tersimpan, rentang bulan khusus, suara, prediksi, pencarian dokumen, riwayat lintas perangkat, dan tindakan tulis belum tersedia. Pertanyaan lanjutan dengan referen seperti “nomor dua” memerlukan nama lengkap karena konteks tidak menyimpan daftar jawaban sebagai memori model.
