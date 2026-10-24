# Teknologi yang digunakan

## 1. Gambaran aplikasi

GASS Mobile memakai React Native untuk Android dan iOS, dengan Expo sebagai framework pengembangan. Aplikasi mengakses API GASS yang sudah ada; autentikasi, otorisasi faskes/bidang, jadwal, penyimpanan laporan, dan verifikasi tetap diputuskan server.

| Pengguna | Fitur mobile |
| --- | --- |
| Operator PKM | Input capaian kinerja/keuangan bulanan, laporan nihil, dan penyimpanan draf |
| Admin Dinkes / akun bidang | Melihat laporan, melakukan koreksi nilai bulanan, verifikasi dan pembatalan per bulan sesuai kewenangan |
| Kepala Dinas | Dashboard, status capaian, tren, dan laporan dengan akses baca |

Form yang tersedia mengikuti skema **capaian agregat bulanan** GASS. Form pasien/kunjungan, foto, GPS, dan notifikasi belum diimplementasikan.

## 2. Inventaris dependensi

Tabel berikut mencatat dependensi langsung dari `package.json` beserta versi pada lockfile saat dokumentasi dibuat. Dependensi transitif tidak ditampilkan seluruhnya. Tanda `^`/`~` pada manifest adalah rentang versi; `npm ci` memakai versi pasti dari lockfile.

### Dependensi aplikasi

| Paket | Rentang manifest | Versi lockfile | Fungsi |
| --- | --- | --- | --- |
| `@react-native-picker/picker` | `2.11.4` | `2.11.4` | Pilihan native untuk tahun, bulan, faskes dan indikator. |
| `@shopify/flash-list` | `2.3.2` | `2.3.2` | Daftar laporan dan indikator dengan recycling item. |
| `@tanstack/react-query` | `^5.104.5` | `5.104.5` | Pengambilan, cache, invalidasi dan status data server. |
| `expo` | `~58.0.17` | `58.0.17` | Framework dan integrasi modul native Android/iOS. |
| `expo-constants` | `~58.0.13` | `58.0.13` | Konstanta runtime/config untuk ekosistem Expo. |
| `expo-dev-client` | `~58.0.14` | `58.0.14` | Development build dengan modul native aplikasi sendiri. |
| `expo-image` | `~58.0.16` | `58.0.16` | Menampilkan aset logo asli dengan contentFit. |
| `expo-linking` | `~58.0.14` | `58.0.14` | Dukungan linking/deep link ekosistem Router. |
| `expo-network` | `~58.0.4` | `58.0.4` | Pemantauan status koneksi untuk UI dan query. |
| `expo-router` | `~58.0.25` | `58.0.25` | Routing berbasis file, stack/tab dan protected routes. |
| `expo-screen-capture` | `~58.0.6` | `58.0.6` | Pencegahan screen capture sesuai kemampuan OS. |
| `expo-secure-store` | `~58.0.2` | `58.0.2` | Penyimpanan draf lokal terenkripsi melalui fasilitas OS. |
| `expo-status-bar` | `~58.0.4` | `58.0.4` | Pengaturan tampilan status bar. |
| `react` | `19.3.0` | `19.3.0` | Komponen UI, state lokal, Context dan hooks. |
| `react-dom` | `19.3.0` | `19.3.0` | Kompatibilitas peer dependency Router, bukan target web aktif. |
| `react-native` | `0.88.0` | `0.88.0` | Runtime dan komponen antarmuka native. |
| `react-native-safe-area-context` | `~5.10.1` | `5.10.1` | Layout mengikuti area aman layar. |
| `react-native-screens` | `~4.30.0` | `4.30.0` | Dukungan layar native untuk navigasi. |
| `zod` | `^4.6.7` | `4.6.7` | Validasi akun, draf, angka dan payload saat runtime. |

### Dependensi pengembangan

| Paket | Rentang manifest | Versi lockfile | Fungsi |
| --- | --- | --- | --- |
| `@types/react` | `~19.3.0` | `19.3.0` | Definisi tipe React untuk TypeScript. |
| `typescript` | `~6.0.3` | `6.0.3` | Pemeriksaan tipe statis dengan mode strict. |
| `eslint` | `^9.39.5` | `9.39.5` | Pemeriksaan pola kode dan hooks. |
| `eslint-config-expo` | `~58.0.4` | `58.0.4` | Aturan lint yang sesuai ekosistem Expo. |
| `@types/node` | `26.6.5` | `26.6.5` | Definisi tipe Node untuk tes dan tooling. |


`react-dom` dipasang untuk memenuhi kompatibilitas peer dependency ekosistem Router. Target aplikasi yang dikonfigurasi tetap Android/iOS; keberadaan paket ini tidak berarti tersedia website mobile terpisah.

## 3. Struktur implementasi

| Lokasi | Tanggung jawab |
| --- | --- |
| `src/app/` | Route login, navigasi tab, dan halaman formulir |
| `src/core/domain.ts` | Tipe domain, schema Zod, angka, bulan, izin UI |
| `src/core/api.ts` | URL API, cookie, timeout, refresh, penanganan error |
| `src/core/session.tsx` | Status akun, login, logout, pembersihan cache |
| `src/core/query.ts` | Kebijakan cache dan retry TanStack Query |
| `src/core/theme.ts` | Token warna sesuai identitas GASS |
| `src/components/` | Tombol, field, kartu, picker dan indikator progres |
| `src/features/reports/` | Pengambilan laporan dan daftar verifikasi |
| `src/features/dashboard/` | Ringkasan dan rincian indikator |
| `src/features/drafts/` | Penyimpanan draf lokal |
| `tests/` | Tes domain dan transport HTTP menggunakan Node test runner |

UI menggunakan komponen React Native dan `StyleSheet`. Tidak menggunakan Tailwind, NativeWind, Redux, Zustand, Axios, atau database SQLite lokal pada implementasi saat ini. Grafik ringkas menggunakan komponen progres; belum ada library grafik khusus.

## 4. Cache, memori, dan koneksi

Pengaturan berikut berasal dari kode project, bukan jaminan performa perangkat:

| Mekanisme | Implementasi |
| --- | --- |
| Cache data server | TanStack Query di memori; key dipisahkan menurut akun dan filter |
| Kesegaran data | Default `staleTime` 60 detik; opsi/master 5 menit |
| Pembersihan cache | Query tidak aktif dibersihkan setelah `gcTime` 5 menit; bukan batas total RAM |
| Retry pembacaan | Maksimal satu retry jika bukan error HTTP di bawah 500 |
| Mutasi | Tidak memakai retry otomatis TanStack Query; transport dapat mengulang request setelah refresh sesi berhasil pada 401 |
| Timeout | 20 detik per request HTTP, termasuk request refresh tersendiri |
| Siklus aplikasi | AppState mengatur fokus, Expo Network mengatur status online |
| Tekanan memori | Query tidak aktif dihapus saat menerima event `memoryWarning` yang tersedia pada platform |
| Daftar laporan | FlashList mendaur ulang komponen item |
| Dashboard | Rincian indikator dibuka seperlunya |

Integrasi fokus/koneksi mengikuti [pola React Native TanStack Query](https://tanstack.com/query/latest/docs/framework/react/react-native). FlashList menggunakan [recycling](https://shopify.github.io/flash-list/docs/recycling/) untuk pemakaian ulang tampilan item.

API laporan dan dashboard saat ini masih mengembalikan semua data yang cocok dengan filter. Virtualisasi daftar mengurangi beban tampilan, tetapi seluruh payload tetap masuk memori. Pagination server dan agregasi khusus mobile diperlukan sebelum menjanjikan dukungan volume besar.

## 5. Penyimpanan draf dan kemampuan offline

Draf disimpan melalui Expo SecureStore. Di Android, data dienkripsi dengan perlindungan Android Keystore; di iOS menggunakan Keychain. Opsi `WHEN_UNLOCKED_THIS_DEVICE_ONLY` digunakan untuk akses Keychain iOS. Rincian perilaku platform ada pada [dokumentasi SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).

Batas aplikasi:

- Maksimal 30 draf per akun, masing-masing maksimal 2.000 byte JSON.
- Masa simpan 7 hari sejak penyimpanan terakhir; draf kedaluwarsa dihapus ketika storage diakses.
- Operasi storage diantrekan berurutan untuk menghindari benturan antaroperasi.
- Draf tidak dikirim otomatis. Pengguna meninjau lalu mengirim ketika tersedia koneksi.
- Pengguna dapat melanjutkan draf offline selama sesi aplikasi masih tersedia. Start dingin dan login kembali memerlukan internet.
- Cache laporan tidak dipersistenkan ke disk. Data yang belum pernah dimuat tidak otomatis tersedia offline.
- Logout menghapus draf akun tersebut; draf belum terkirim bukan cadangan permanen data instansi.

## 6. Keamanan dan integrasi backend

Autentikasi mempertahankan cookie HttpOnly backend. Mobile mengirim `credentials: include` dan header kompatibilitas `X-Gass-Client: web`; role tetap berasal dari sesi server. Password/token tidak disimpan ke draf. Cookie dikelola stack HTTP native dan perlu diuji pada perangkat Android/iOS.

URL produksi wajib HTTPS. Backend produksi harus mengaktifkan cookie Secure; pembatasan akses dan input tetap diperiksa di server. Protected routes dan penyembunyian tombol mobile hanya melengkapi kontrol server.

Refresh serentak digabung menjadi satu request. Error HTTP ditampilkan dengan pesan aman. Layar ditutup ketika aplikasi tidak aktif dan screen capture dicegah sejauh didukung OS. Ini tidak menjamin perlindungan terhadap perangkat yang sudah dikompromikan.

Mobile mengirim `expectedUpdatedAt` untuk mencegah penimpaan laporan yang berubah sejak dibuka. Backend membandingkannya di transaksi serializable: `null` untuk laporan baru, timestamp untuk laporan yang sudah ada. Konflik versi ditolak. Mekanisme ini bukan sinkronisasi otomatis dan bukan idempotency key untuk mengulang pengiriman tanpa pemeriksaan.

Backend GASS tetap menggunakan NestJS, Prisma, PostgreSQL dan layanan autentikasi eGov/Simpeg. Redis/BullMQ berada di sisi backend; paket-paket tersebut tidak dipasang ke HP. Detail konfigurasi server ada di [README utama](../../README.md).

## 7. Status validasi

Catatan pengujian implementasi awal, 23 Oktober 2026: 6 tes mobile dan 51 tes backend lolos, 25 tes integrasi database dilewati, typecheck/lint lolos, Expo Doctor 20/20, bundle Android/iOS berhasil diekspor. Belum ada pengujian perangkat nyata, profiling RAM/baterai, atau pentest.

Audit pada implementasi awal mencatat 19 temuan high di rantai dependensi, bersumber dari advisori `braces` dan `node-forge`. Itu adalah hasil pemeriksaan saat tersebut, bukan status keamanan permanen. Jalankan `npm audit` lagi sebelum rilis; rincian ada di [catatan kesiapan rilis](../README.md#batas-kesiapan-rilis).

## Ikon antarmuka

`lucide-react-native` menyediakan ikon resmi Lucide; `react-native-svg` menangani rendering native. Versi terkunci terdapat di package-lock.json. Ikon diimpor secara eksplisit di src/components/ui.tsx, dengan ukuran dan warna dari tema GASS. Logo pemerintah tetap berupa aset asli.
