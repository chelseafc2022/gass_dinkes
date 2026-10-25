# Langkah instalasi dan menjalankan GASS Mobile

Panduan ini untuk project yang sudah tersedia di `gass/mobile`. Tidak perlu menjalankan `create-expo-app` lagi.

## 1. Siapkan perangkat pengembangan

| Kebutuhan | Keterangan |
| --- | --- |
| Git | Mengambil repository dan mengelola perubahan |
| Node.js | Gunakan versi pada `.nvmrc`: **24.12.0** |
| npm | Paket manager project; lockfile menggunakan npm |
| Backend GASS | Sudah berjalan dan dapat diakses melalui HTTPS dari perangkat |
| Akun uji | Akun eGov/Simpeg yang sudah diberi akses GASS dan penugasan role/faskes/bidang |
| Android lokal | Android Studio, Android SDK/Platform Tools, emulator atau HP USB debugging, JDK yang sesuai toolchain SDK 58 |
| iOS lokal | macOS, Xcode lengkap, simulator atau perangkat iOS dan kebutuhan signing yang sesuai |

Ikuti [setup lingkungan React Native](https://reactnative.dev/docs/set-up-your-environment) untuk SDK/JDK/Xcode. Versi toolchain native harus sesuai versi React Native/Expo project; jangan mengambil tutorial SDK lama sebagai acuan tunggal.

Jika memakai nvm pada macOS/Linux, dari folder mobile:

```sh
cd /lokasi/repository/gass/mobile
nvm install
nvm use
node --version
npm --version
```

`/lokasi/repository` adalah placeholder, ganti dengan lokasi sebenarnya. Pengguna Windows dapat memasang Node dengan pengelola versi yang tersedia di Windows; perintah `nvm` di atas mengacu pada nvm untuk shell Unix.

## 2. Pasang dependensi

```sh
npm ci
```

`npm ci` memakai lockfile yang sudah disepakati. Jangan menghapus lockfile atau memakai `--force`/`--legacy-peer-deps` untuk menutupi konflik versi. Folder `node_modules` tidak perlu dimasukkan ke Git.

Periksa kompatibilitas awal:

```sh
npx expo install --check
npm run doctor
```

Saat menambah paket di kemudian hari, gunakan `npx expo install NAMA_PAKET` supaya versi native disesuaikan dengan Expo. Jangan memperbarui React Native secara terpisah tanpa mengecek matriks kompatibilitas SDK.

## 3. Konfigurasi API

macOS/Linux:

```sh
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```dotenv
EXPO_PUBLIC_API_URL=https://HOST-GASS-ANDA/api
```

Ganti `HOST-GASS-ANDA` dengan host HTTPS yang benar. URL harus mengarah ke API, termasuk akhiran `/api`, tanpa username/password di URL. Jangan memasukkan kredensial database, password eGov, atau JWT secret ke environment mobile.

Hal yang perlu dipastikan:

1. Backend memakai versi project yang sudah mendukung `expectedUpdatedAt`.
2. Reverse proxy HTTPS meneruskan `/api` ke layanan GASS; sertifikat dipercaya perangkat.
3. HP dapat mengakses jaringan host. `localhost` di HP berarti HP tersebut, bukan komputer developer.
4. Backend GASS saat ini bind ke `127.0.0.1`; gunakan reverse proxy yang dapat dijangkau perangkat.
5. Backend produksi memakai `NODE_ENV=production` agar cookie Secure aktif.
6. Jangan mengubah validasi origin atau RBAC backend hanya untuk mengatasi kesalahan konfigurasi URL.

Variabel `EXPO_PUBLIC_*` terlihat di bundle aplikasi. Perubahan nilainya memerlukan reload/restart Metro pada pengembangan atau build baru untuk binary rilis. Panduan backend ada di [README GASS](../../README.md#menjalankan-lokal).

## 4. Jalankan Android secara lokal

1. Buka Android Studio dan siapkan SDK/emulator sesuai toolchain project.
2. Jalankan emulator, atau sambungkan HP dengan USB debugging dan setujui akses komputer.
3. Pastikan perangkat terdeteksi:

```sh
adb devices
```

4. Dari `mobile`, buat dan pasang development build:

```sh
npm run android
```

Perintah tersebut menjalankan `expo run:android`, menghasilkan project native jika diperlukan, membangun aplikasi, dan biasanya menjalankan Metro. Build pertama dapat lebih lama karena mengunduh komponen Gradle/SDK.

Untuk sesi pengembangan berikutnya jika development build sudah terpasang:

```sh
npm start
```

Buka aplikasi development build GASS di perangkat. Pastikan perangkat dapat menjangkau Metro melalui koneksi pengembangan yang digunakan. Akses Metro dan akses API HTTPS adalah dua koneksi berbeda.

## 5. Jalankan iOS secara lokal

1. Pasang Xcode lengkap, buka sekali untuk menyelesaikan instalasi komponen/lisensi.
2. Pilih Xcode yang benar pada pengaturan developer tools.
3. Pastikan simulator tersedia:

```sh
xcrun simctl list devices available
```

4. Dari `mobile`:

```sh
npm run ios
```

Perintah menjalankan `expo run:ios`. Untuk memilih perangkat:

```sh
npx expo run:ios --device
```

Pengujian iPhone fisik memerlukan signing/provisioning sesuai akun Apple dan kebijakan organisasi. Windows/Linux tidak dapat membuat build iOS lokal dengan Xcode; gunakan macOS atau EAS Build.

Gunakan **development build** project, bukan mengasumsikan semua modul selalu tersedia dalam Expo Go. Penjelasan perbedaannya ada di [dokumentasi development build Expo](https://docs.expo.dev/develop/development-builds/introduction/).

## 6. Alternatif build cloud menggunakan EAS

Bagian ini opsional dan memerlukan akun Expo serta pengaturan project/signing. Build cloud mengunggah sumber project yang relevan ke layanan Expo.

Dari `mobile`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Jika project sudah ditautkan, jangan membuat project EAS baru; gunakan project milik organisasi. Pertahankan profil yang sudah ada di `eas.json` ketika melakukan konfigurasi.

Atur `EXPO_PUBLIC_API_URL` di environment EAS yang dipakai profil build. Pastikan environment tersebut benar sebelum build; `.env` lokal yang diabaikan Git tidak boleh menjadi satu-satunya sumber konfigurasi cloud.

| Profil dalam `eas.json` | Kegunaan | Perintah |
| --- | --- | --- |
| `development` | Development client internal | `npx eas-cli@latest build --profile development --platform android` |
| `preview` | APK Android internal tanpa Metro | `npx eas-cli@latest build --profile preview --platform android` |
| `production` | Binary untuk jalur distribusi produksi | `npx eas-cli@latest build --profile production --platform android` |

Untuk iOS, ganti platform dengan `ios` dan ikuti persyaratan Apple/signing; distribusi internal iOS memiliki aturan perangkat/provisioning tersendiri. Build tidak otomatis menerbitkan aplikasi ke store. Lihat [panduan resmi EAS Build](https://docs.expo.dev/build/setup/).

Sebelum distribusi, konfirmasikan package identifier `id.go.konselkab.gass`, ikon launcher resmi, URL API lingkungan tujuan, dan kepemilikan akun signing.

### Build APK lokal dan alasan ukuran file

APK internal dapat dibuat tanpa EAS jika Android SDK/JDK sudah tersedia:

```sh
cd mobile/android
./gradlew assembleRelease
```

Hasilnya berada di `android/app/build/outputs/apk/release/app-release.apk`. Build lokal project saat ini masih memakai **debug keystore** pada varian release, sehingga hanya untuk instalasi dan pengujian internal. Jangan mengunggah APK tersebut ke Play Store atau menganggapnya sebagai signing resmi instansi.

Build 25 Oktober 2026 menghasilkan APK universal sekitar **103 MB**. Ukuran ini terutama berasal dari library native untuk empat arsitektur yang digabung ke satu APK:

| Isi APK universal | Ukuran tidak terkompresi sekitar |
| --- | ---: |
| `arm64-v8a` | 24,1 MB |
| `armeabi-v7a` | 16,7 MB |
| `x86_64` | 25,6 MB |
| `x86` | 25,5 MB |
| Bundle/aset aplikasi | 4,4 MB |
| Resource dan bagian lain | 9,7 MB |

Empat arsitektur diperlukan agar satu APK bisa dipasang pada banyak jenis HP dan emulator. Sebagian besar perangkat hanya memakai satu arsitektur; tiga salinan library native lainnya tidak digunakan pada perangkat tersebut. Library React Native, Hermes, Expo Modules, Reanimated, dan Worklets menyumbang bagian terbesar. R8/minify sudah aktif, jadi ukuran besar bukan terutama karena gambar atau kode layar GASS.

Untuk APK uji yang lebih kecil khusus HP Android modern 64-bit, bangun hanya `arm64-v8a`:

```sh
cd mobile/android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

APK `arm64-v8a` tidak dapat dipasang pada HP 32-bit atau emulator `x86/x86_64`. Pertahankan APK universal jika arsitektur perangkat sasaran belum diketahui.

Hasil build GASS saat ini: APK khusus `arm64-v8a` sekitar **35 MB**, sedangkan APK universal sekitar **103 MB**. Gunakan APK `arm64-v8a` sebagai pilihan utama untuk HP Android modern dan simpan APK universal sebagai cadangan kompatibilitas.

Untuk distribusi Google Play, gunakan **AAB** dengan signing resmi. Google Play mengambil AAB dan mengirim hanya library yang cocok dengan perangkat, sehingga ukuran unduhan pengguna lebih kecil. Profil `production` EAS secara default menghasilkan AAB, sedangkan profil `preview` pada `eas.json` sengaja menghasilkan APK untuk instalasi langsung.

Nilai `EXPO_PUBLIC_API_URL` ditanam saat bundling. Pastikan `.env` berisi URL production sebelum menjalankan Gradle, lalu verifikasi ulang aplikasi dengan login, restart, refresh sesi, dan logout pada perangkat fisik.

## 7. Pemeriksaan setelah instalasi

```sh
npm run typecheck
npm run lint
npm test
npm run doctor
npm run export:android
npx expo export --platform ios --output-dir dist-ios
npm audit
```

Ekspor menghasilkan bundle/aset, **bukan APK atau IPA signed**. Audit bisa menemukan kerentanan meskipun typecheck, tes, dan bundling berhasil. Jangan langsung menjalankan `npm audit fix --force`, karena dapat mengganti versi major SDK yang tidak kompatibel.

Uji alur pada akun uji dan data uji:

1. Login, refresh sesi, restart aplikasi, dan logout pada Android/iOS.
2. Operator hanya mengakses faskes yang ditugaskan.
3. Simpan laporan nihil (`0`) dan realisasi biasa pada periode terbuka.
4. Simpan draf, putus koneksi, buka/ubah draf dalam sesi yang masih aktif, lalu kirim saat online.
5. Admin/bidang memverifikasi satu bulan dan memastikan operator tidak dapat mengoreksinya tanpa kewenangan.
6. Ubah laporan di web setelah formulir mobile dibuka, lalu pastikan pengiriman versi lama ditolak.
7. Akun pimpinan tidak mendapatkan aksi tulis.
8. Periksa keyboard, safe area, teks besar, pembaca layar, dan konsumsi RAM pada HP sasaran.

## 8. Masalah umum

| Gejala | Pemeriksaan / tindakan |
| --- | --- |
| `EXPO_PUBLIC_API_URL` belum diisi | Isi `.env`, hentikan Metro, lalu jalankan ulang `npm start` |
| `Network request failed` | Periksa HTTPS/sertifikat, jaringan HP, host API dan reverse proxy; jangan menonaktifkan validasi TLS |
| Berhasil di komputer, gagal di HP | Jangan menggunakan `localhost` komputer sebagai alamat API HP |
| `simctl` tidak ditemukan | Pastikan Xcode lengkap tersedia dan toolchain aktif, bukan hanya Command Line Tools |
| Android tidak terdeteksi | Periksa `adb devices`, USB debugging, otorisasi USB atau emulator |
| Module native tidak tersedia | Build ulang development client setelah mengubah modul native/config; restart Metro saja tidak cukup |
| Konflik versi paket | Jalankan `npx expo install --check` dan `npm run doctor`, perbaiki versi kompatibel, simpan lockfile |
| HTTP 401 | Periksa akun, koneksi eGov/Simpeg, cookie/sesi; masuk ulang jika sesi dicabut |
| HTTP 403 | Periksa role, faskes/bidang, matriks izin, periode tertutup dan bulan terverifikasi |
| HTTP 409 | Muat laporan terbaru dan tinjau perubahan sebelum mengoreksi kembali |
| Timeout ketika mengirim | Cek laporan server terlebih dahulu; request mungkin sudah tersimpan |
| Draf tidak muncul setelah logout | Logout memang menghapus draf akun; draf juga kedaluwarsa setelah 7 hari |

Jangan menaruh `.env`, password, token, file signing, atau credential database dalam Git maupun tangkapan layar troubleshooting.

### Setelah penambahan ikon Lucide

Dependensi `lucide-react-native` dan `react-native-svg` sudah tercatat di package.json. Jalankan `npm ci`, lalu bangun ulang development client dengan `npm run android`; Fast Refresh saja tidak menambahkan modul native SVG ke APK lama.

### Login ditolak padahal kata sandi benar

Periksa spasi di awal/akhir isian. Mobile menampilkan tombol **Hapus spasi tambahan** ketika terdeteksi; tekan hanya bila spasi tersebut tidak merupakan bagian kata sandi. Username/NIP dipangkas otomatis, sedangkan kata sandi dikirim persis sesuai input. Status 401 menunjukkan kredensial ditolak, 403 menunjukkan akses/penugasan GASS belum tersedia, dan 503 menunjukkan layanan identitas tidak tersedia.
