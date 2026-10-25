# GASS Mobile

Aplikasi Android/iOS untuk input capaian bulanan petugas PKM, verifikasi Admin Dinkes/bidang, dan dashboard pimpinan. Menggunakan API GASS yang sudah ada; tidak menampilkan angka contoh sebagai data resmi.


Dokumentasi lengkap tersedia di **[folder doc](doc/README.md)**: inventaris teknologi, langkah instalasi, serta alasan dan perbandingan alternatif.

## Menjalankan

Node 24.12+ direkomendasikan (lihat `.nvmrc`).

```sh
cd mobile
npm ci
cp .env.example .env
# Isi EXPO_PUBLIC_API_URL dengan URL HTTPS GASS yang dapat diakses HP, termasuk /api.
npm run android
# atau npm run ios (memerlukan Xcode lengkap)
npm start
```

`npm run android/ios` membuat development build native. SDK 58 memerlukan development build selama dukungan Expo Go SDK 58 belum tersedia di store. Android memerlukan Android Studio/JDK/SDK; iOS memerlukan Xcode. Untuk build cloud, konfigurasi akun/project EAS dan jalankan `npx eas-cli@latest build --profile development --platform android`. Tidak ada build/upload/publikasi ke akun eksternal yang dilakukan dalam perubahan ini.

Untuk APK internal: `npx eas-cli@latest build --profile preview --platform android`. Atur `EXPO_PUBLIC_API_URL` di environment build EAS; nilai public tersebut tertanam dalam bundle dan **tidak boleh berisi secret**. Bundle/package identifier awal `id.go.konselkab.gass` perlu disesuaikan dengan kepemilikan resmi instansi sebelum publikasi. Ikon launcher rilis masih perlu disiapkan; logo dalam aplikasi menggunakan aset asli proyek tanpa pewarnaan ulang.

Backend tetap bind ke localhost. Gunakan reverse proxy HTTPS yang sudah dikonfigurasi menuju backend/frontend GASS, bukan `localhost` di HP. Jalankan backend versi perubahan ini untuk dukungan `expectedUpdatedAt`; tidak ada migrasi database baru.

## Teknologi dan struktur

- Expo 58.0.19, React Native 0.88.0, React 19.3, TypeScript strict.
- Expo Router: routing berbasis file dan protected routes; tab lazy.
- TanStack Query v5: cache memori per pengguna/filter, stale time 60 detik, GC 5 menit, maksimal satu retry pembacaan sementara; mutasi tidak diulang otomatis.
- FlashList v2: daur ulang item daftar; rincian dashboard dibuka seperlunya.
- Zod: validasi akun, draf, angka, periode, dan payload.
- SecureStore: draf dalam Keychain/Keystore, device-only saat perangkat terbuka; maksimal 30 slot, payload per slot <2 KB, TTL 7 hari dan akses storage berurutan.
- Expo Network/AppState: status offline, refetch saat kembali aktif/online, membersihkan query tidak aktif saat memory warning.
- Expo Image: aset logo lokal. Tidak ada kamera, lokasi, kontak, telemetry, atau izin medis tambahan.

```text
src/app/                 Route login, tab, dan formulir
src/core/                Transport API, session, query, domain, tema
src/components/          Komponen UI reusable
src/features/dashboard/  Ringkasan kinerja dan rincian indikator
src/features/reports/    Query laporan, input dan verifikasi
src/features/drafts/     Penyimpanan draf terenkripsi
 tests/                  Tes kontrak domain dan transport
```

Palet emerald/teal/mint/magenta mengikuti AGENTS.md. Pada React Native, token warna berada di `src/core/theme.ts` sebagai padanan CSS variables web.

## Alur yang tersedia

1. Masuk dengan identitas eGov/Simpeg yang telah diaktifkan di GASS.
2. PKM memilih indikator/sub kegiatan, bulan, tahun, lalu memasukkan realisasi. Laporan baru menerima target/pagu tahunan; koreksi target laporan lama tetap melalui web. Nilai nol diperlakukan sebagai laporan nihil, bukan isian kosong.
3. Simpan ke server saat online, atau simpan draf terenkripsi. Draf tidak otomatis menjadi laporan resmi.
4. Draf dapat dibuka dan diubah offline selama sesi aplikasi masih tersedia. Masuk kembali/start dingin memerlukan internet; master baru tidak dapat diunduh offline. Buka data/pilihan sebelum turun lapangan.
5. Admin/bidang melihat nilai, target, status, pemeriksa, kemudian mengonfirmasi verifikasi/pembatalan per bulan. Server memvalidasi lingkup faskes/bidang dan snapshot nilai/target.
6. Pimpinan memantau persentase terverifikasi, keuangan, status threshold, tren triwulan, dan lima faskes prioritas; tanpa kontrol tulis.
7. Keluar mencabut sesi server, menghapus draf akun, membatalkan query, dan membersihkan cache. Logout memerlukan koneksi; jika gagal, pengguna diminta mencoba lagi.

## Autentikasi dan keamanan

Mempertahankan kontrak cookie HttpOnly API yang sudah ada (`credentials: include`). `X-Gass-Client: web` adalah header kompatibilitas yang diwajibkan guard server, bukan identitas role atau cara melewati otorisasi. Tidak ada token/password yang disalin ke AsyncStorage atau draf. Cookie dikelola stack HTTP native. Backend produksi wajib `NODE_ENV=production` supaya cookie Secure. Aplikasi produksi menolak URL selain HTTPS; ATS iOS tidak diberi pengecualian arbitrary loads.

Refresh sesi digabung menjadi satu request ketika beberapa query menerima 401. Error HTTP ditampilkan dengan pesan aman, timeout 20 detik, dan tidak ada retry otomatis mutasi. Data layar ditutup saat aplikasi background; screen capture prevention mengikuti kemampuan OS. Protected routes dan izin UI hanya untuk pengalaman pengguna; RBAC server tetap sumber otoritas.

Mobile mengirim `expectedUpdatedAt` pada setiap penyimpanan. Backend memeriksanya dalam transaksi serializable yang sama dengan penulisan. `null` berarti belum ada laporan; timestamp berarti harus sama dengan versi yang dimuat. Versi berubah/deleted menghasilkan 409. Web lama boleh menghilangkan field ini sehingga kontraknya tetap kompatibel. Bila timeout terjadi, cek server terlebih dahulu: request mungkin sudah tersimpan. Draf tidak ditimpa atau dikirim ulang otomatis.

Draf kedaluwarsa dibersihkan saat storage diakses; ini bukan penghapusan terjadwal saat aplikasi mati. Login kembali diperlukan setelah sesi berakhir. Akun berbeda tidak dapat membuka draf akun lain dari UI. Perangkat rooted/jailbroken tidak dijamin aman hanya dengan SecureStore.

## Pemeriksaan

```sh
npm run typecheck
npm run lint
npm test
npm run doctor
npm run export:android
npx expo export --platform ios --output-dir dist-ios
```

Hasil pemeriksaan terakhir: typecheck/lint lolos, Expo Doctor 20/20, 11 tes mobile lolos, dan APK release internal berhasil dibuat. APK universal sekitar 103 MB karena memuat library native untuk `arm64-v8a`, `armeabi-v7a`, `x86`, dan `x86_64`; rincian dan cara membuat APK khusus `arm64-v8a` tersedia di [panduan instalasi](doc/02-instalasi.md#build-apk-lokal-dan-alasan-ukuran-file). APK lokal tersebut memakai debug keystore dan bukan artefak Play Store. Backend: 51 tes lolos, 25 tes integrasi database dilewati tanpa `TEST_DATABASE_URL`.

APK internal yang tersedia: varian `arm64-v8a` sekitar 35 MB untuk mayoritas HP Android modern dan varian universal sekitar 103 MB sebagai cadangan untuk arsitektur lain.

## Batas kesiapan rilis

- Belum diuji di perangkat fisik/simulator: lingkungan ini tidak menyediakan `simctl`/Xcode lengkap. Verifikasi khusus Android/iOS diperlukan untuk cookie login → refresh → restart → logout, SecureStore, keyboard, pembaca layar, dan tampilan tablet. Belum dilakukan pentest atau profiling RAM/baterai perangkat kelas rendah.
- Endpoint laporan/dashboard backend masih mengembalikan seluruh data sesuai filter, belum cursor pagination/agregasi khusus mobile. FlashList menghemat render, tetapi tidak menghilangkan ukuran payload. Untuk skala besar, tahap berikutnya adalah pagination server, endpoint pilihan yang lebih kecil, dan agregasi dashboard; jangan menganggap daftar virtual saja cukup.
- Audit npm saat ini melaporkan 19 temuan high dalam rantai dependensi, bersumber dari dua advisori: `braces <=3.0.3` (GHSA-vfj7-8cjw-p6xm) dan `node-forge <=1.4.0` (GHSA-86w9-cpqp-85rv). Versi terbaru registry saat pemeriksaan masih 3.0.3/1.4.0. Saran `npm audit fix --force` menurunkan Expo ke 44/RN 0.72, sehingga tidak diterapkan. Pantau patch upstream dan ulang audit sebelum distribusi produksi; aplikasi belum diklaim bebas kerentanan. Jangan mengekspos Metro/development server ke internet.
- Input yang tersedia adalah capaian agregat bulanan sesuai skema GASS. Form pasien/kunjungan individu, lampiran foto/GPS, push notification, dan sinkronisasi otomatis bukan bagian kontrak backend saat ini.

Referensi: [Expo SDK 58](https://expo.dev/changelog/sdk-58), [TanStack Query React Native](https://tanstack.com/query/latest/docs/framework/react/react-native), [Expo SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).
