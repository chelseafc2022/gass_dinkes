# Alasan pemilihan dan perbandingan teknologi

Keputusan berikut mempertimbangkan kebutuhan GASS: input lapangan pada HP, verifikasi sesuai kewenangan, dashboard pimpinan, integrasi backend yang sudah ada, serta kemudahan pemeliharaan oleh tim TypeScript/React.

Kolom **keputusan GASS** adalah penilaian untuk project ini. Perbandingan bersifat kualitatif; belum ada benchmark aplikasi yang membuktikan satu pilihan paling cepat, paling kecil, atau paling hemat baterai. Alternatif yang disebut tidak otomatis terpasang di project.

## 1. Platform aplikasi: React Native dibanding Flutter dan native langsung

| Pilihan | Kelebihan yang relevan | Konsekuensi | Kapan cocok |
| --- | --- | --- | --- |
| **React Native + React** | Android/iOS dalam satu basis kode; pengetahuan React/TypeScript dari frontend GASS dapat digunakan | Tetap perlu debugging platform, dependensi native, dan pengujian perangkat | Tim sudah bekerja dengan React dan membangun formulir/dashboard bisnis |
| Flutter | Satu basis kode Dart dengan sistem widget/rendering yang konsisten | Tim GASS perlu memelihara bahasa dan ekosistem tambahan; komponen React tidak langsung digunakan | Tim menguasai Dart atau membutuhkan UI khusus yang kuat dalam ekosistem Flutter |
| Kotlin/Compose + Swift/SwiftUI | Kendali langsung terhadap fitur dan perilaku tiap platform | Dua implementasi antarmuka dan lebih banyak pekerjaan sinkronisasi fitur | Integrasi platform sangat mendalam atau tersedia tim Android/iOS terpisah |

**Keputusan GASS:** React Native mengikuti permintaan produk dan kemampuan ekosistem yang sudah dipakai GASS. Komponen Next.js/HTML tidak otomatis berjalan di React Native; yang terutama dapat digunakan kembali adalah pengetahuan, tipe, aturan domain yang sesuai, dan kontrak API.

Sumber platform: [React Native](https://reactnative.dev/docs/environment-setup), [arsitektur Flutter](https://docs.flutter.dev/resources/architectural-overview). Perkiraan beban pemeliharaan di tabel merupakan pertimbangan project, bukan hasil benchmark vendor.

## 2. Framework dan build: Expo dibanding pengelolaan native manual

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **Expo + development build** | Modul native dan versi dikoordinasikan SDK; konfigurasi melalui app config/config plugins; tersedia jalur build lokal/cloud | Upgrade harus mengikuti kompatibilitas SDK; perubahan modul native memerlukan rebuild |
| React Native dengan project native dikelola manual | Kendali langsung atas Gradle, Xcode, dan integrasi native | Tim memelihara konfigurasi native dan proses upgrade lebih banyak |
| **EAS Build** sebagai opsi cloud | Build/signing melalui layanan terkelola, berguna untuk tim tanpa seluruh toolchain lokal | Memerlukan akun, konfigurasi credential, koneksi dan pertimbangan kebijakan/biaya layanan |
| Build lokal / CI sendiri | Kendali infrastruktur, sumber dan jadwal build | Tim menyediakan mesin, SDK, signing, cache build dan pemeliharaan CI |

Expo adalah framework di atas React Native, bukan pesaing runtime React Native. EAS adalah pilihan layanan build; penggunaan Expo tidak mewajibkan semua build dilakukan di cloud.

**Keputusan GASS:** gunakan Expo untuk menyederhanakan integrasi dan versi modul. Development build memuat modul aplikasi sendiri. Profil EAS telah disiapkan, tetapi project belum otomatis ditautkan, diunggah, atau diterbitkan. [Development builds Expo](https://docs.expo.dev/develop/development-builds/introduction/), [EAS Build](https://docs.expo.dev/build/setup/).

## 3. Navigasi: Expo Router dibanding React Navigation langsung

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **Expo Router** | Struktur route mengikuti file; layout, protected routes dan deep linking terintegrasi dengan Expo | Tim mengikuti konvensi folder dan lifecycle Router |
| React Navigation langsung | Susunan navigator didefinisikan eksplisit; sesuai untuk struktur navigasi yang ingin dikontrol lewat konfigurasi kode | Pendaftaran screen dan konfigurasi linking perlu dikelola sendiri |

**Keputusan GASS:** Router cocok untuk pemisahan login, tab per fungsi, dan formulir laporan. Kedua opsi berada dalam ekosistem navigasi yang berkaitan; menggunakan Router tidak berarti seluruh lapisan React Navigation hilang. Proteksi route bukan pengganti RBAC API. [Expo Router](https://docs.expo.dev/router/introduction/), [React Navigation](https://reactnavigation.org/docs/getting-started/).

## 4. Data server: TanStack Query dibanding RTK Query dan fetch manual

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **TanStack Query** | Cache, status loading/error, invalidasi dan lifecycle request tanpa mengharuskan Redux | Key query dan invalidasi harus dirancang; persistensi offline bukan otomatis aktif |
| RTK Query | Cache/fetching terintegrasi dengan Redux Toolkit dan model endpoint | Membawa pengaturan Redux; menarik jika Redux sudah menjadi standar aplikasi |
| Fetch + state/effect manual | Sedikit dependensi dan fleksibel untuk request sederhana | Deduplication, cache, pembatalan, retry, invalidasi dan sinkronisasi layar perlu dirawat sendiri |

**Keputusan GASS:** data utama berasal dari server dan project mobile belum memerlukan Redux. TanStack Query mengelola data server; Context/useState menangani sesi dan state formulir. Redux/Zustand adalah pengelola state aplikasi, sehingga tidak selalu merupakan pengganti langsung cache server.

RTK Query layak dipilih bila aplikasi kemudian memiliki kebutuhan Redux yang luas. Cache sekarang hanya di memori untuk membatasi persistensi data di perangkat. [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview), [RTK Query](https://redux.js.org/toolkit/rtk-query/overview).

## 5. Daftar: FlashList dibanding FlatList dan ScrollView

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **FlashList v2** | Recycling item sesuai kebutuhan daftar laporan berulang | State komponen item perlu mengikuti identitas data saat item didaur ulang; menambah dependensi |
| FlatList | Komponen daftar virtual bawaan React Native; cukup untuk banyak kasus | Perlu tuning render/item/layout sesuai beban aktual |
| ScrollView | Sederhana untuk formulir dan konten pendek | Merender seluruh anak; kurang tepat untuk daftar panjang |

**Keputusan GASS:** FlashList untuk laporan, draf dan indikator; ScrollView untuk halaman formulir pendek. Jika hasil profiling menunjukkan FlatList sudah mencukupi, pengurangan dependensi dapat dipertimbangkan. Tidak ada klaim FlashList selalu lebih cepat untuk semua layar. Recycling juga tidak memperkecil payload API. [FlashList recycling](https://shopify.github.io/flash-list/docs/recycling/).

## 6. Penyimpanan: SecureStore dibanding AsyncStorage dan SQLite

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **Expo SecureStore** | Penyimpanan key-value menggunakan fasilitas keamanan OS | Cocok untuk nilai kecil; tidak dirancang sebagai database laporan besar |
| AsyncStorage | API key-value untuk preferensi dan data tidak sensitif | Data tidak terenkripsi secara bawaan; tidak dipilih untuk draf GASS |
| SQLite / Expo SQLite | Query, indeks, transaksi dan data relasional lokal dalam volume lebih besar | Butuh schema/migrasi dan kebijakan retensi; perlindungan data perlu dirancang tersendiri |

**Keputusan GASS:** draf sekarang kecil dan dibatasi 30 slot sehingga SecureStore memadai untuk tahap awal. Jumlah slot dan batas ukuran adalah kebijakan aplikasi, bukan kapasitas universal SecureStore.

Jika dibutuhkan ribuan kunjungan, master offline, atau relasi antarentitas, evaluasi SQLite dengan rancangan enkripsi/manajemen kunci yang sesuai. SQLite biasa tidak boleh dianggap otomatis terenkripsi. Peralihan storage juga memerlukan migrasi data dan sinkronisasi server; mengganti library saja tidak membuat aplikasi menjadi sepenuhnya offline.

Sumber: [penyimpanan Expo](https://docs.expo.dev/develop/user-interface/store-data/), [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [Expo SQLite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).

## 7. Validasi dan bahasa: TypeScript + Zod dibanding JavaScript/Yup

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **TypeScript strict** | Menangkap ketidaksesuaian tipe saat pengembangan | Tidak memvalidasi JSON dari jaringan ketika aplikasi berjalan |
| JavaScript tanpa pemeriksaan tipe statis | Setup sederhana | Lebih banyak ketidaksesuaian kontrak baru diketahui lewat tes/runtime |
| **Zod** | Schema runtime dan inferensi tipe; pola yang serupa sudah dipakai backend GASS | Menambah kode validasi dan ukuran bundle; schema harus dipelihara |
| Yup | Schema parsing/validasi dengan dukungan TypeScript; sesuai jika sudah menjadi standar tim | Migrasi tidak memberi keuntungan otomatis bila kontrak saat ini sudah menggunakan Zod |

**Keputusan GASS:** TypeScript dan Zod saling melengkapi. Zod memvalidasi akun, draf dan payload input. Response laporan/dashboard saat ini masih memakai tipe TypeScript, belum seluruhnya diperiksa dengan schema runtime. Memperluas validasi response adalah penguatan berikutnya, bukan fitur yang sudah selesai. [Zod](https://zod.dev/), [Yup](https://github.com/jquense/yup).

## 8. HTTP: fetch bawaan dibanding Axios

| Pilihan | Kelebihan | Konsekuensi |
| --- | --- | --- |
| **Fetch + wrapper GASS** | Tidak menambah library HTTP; memakai kontrak API yang tersedia | Timeout, status error, cookie dan koordinasi refresh ditangani wrapper sendiri |
| Axios | Client HTTP dengan konfigurasi, interceptor dan fitur transformasi | Menambah dependensi dan pola konfigurasi; tetap perlu merancang refresh/otorisasi aplikasi |

**Keputusan GASS:** wrapper yang kecil cukup untuk JSON API saat ini. Axios layak dipertimbangkan bila kebutuhan transport/interceptor semakin kompleks, bukan karena otomatis lebih aman atau lebih cepat. Perilaku cookie pada Android/iOS tetap perlu diuji untuk kedua pilihan. [Dokumentasi Axios](https://axios-http.com/docs/intro).

## 9. UI dan modul pendukung

| Kebutuhan | Pilihan GASS | Alternatif sejenis | Alasan / pertimbangan |
| --- | --- | --- | --- |
| Styling | StyleSheet + token tema | NativeWind atau UI kit | Komponen saat ini sedikit; token GASS dapat dikontrol tanpa menambah sistem styling. UI kit menarik saat kebutuhan komponen makin besar |
| Gambar | Expo Image | React Native Image | Konsisten dengan modul Expo dan pengaturan gambar; untuk aset sederhana Image bawaan juga dapat mencukupi |
| Pilihan form | Native Picker | Dropdown kustom | Menggunakan pilihan native; pencarian indikator yang sangat banyak dapat memerlukan selector khusus |
| Status koneksi | Expo Network | NetInfo | Selaras dengan SDK yang digunakan; NetInfo adalah alternatif bila dibutuhkan API koneksi yang sesuai kebutuhannya |
| Unit test awal | Node test runner | Jest | Tes awal berfokus pada fungsi domain dan transport tanpa renderer. Pengujian komponen native memerlukan tooling/mocking tambahan |

Tabel ini adalah alasan desain, bukan hasil pengukuran perbandingan library. `safe-area-context`, `screens`, `linking`, `constants`, dan `status-bar` mendukung integrasi navigasi/layout; tidak perlu diganti satu per satu hanya untuk mengejar jumlah library terbaru.

## 10. Pemicu evaluasi ulang arsitektur

| Kebutuhan yang berkembang | Tindakan yang layak dievaluasi |
| --- | --- |
| Laporan puluhan ribu baris | Pagination/filter server, endpoint pilihan yang kecil, agregasi dashboard sebelum tuning UI tambahan |
| Kerja lapangan berhari-hari tanpa internet | Database lokal, master offline, kebijakan akses offline, antrean sinkronisasi dan pemulihan konflik |
| Pengiriman otomatis saat koneksi kembali | Idempotency server, status antrean, backoff, rekonsiliasi timeout, dan aturan perubahan versi |
| Form kompleks dengan banyak validasi | Library form dan selector pencarian setelah mengukur kebutuhan/rerender |
| Integrasi perangkat khusus | Uji kompatibilitas SDK/module; buat native module bila memang dibutuhkan |
| Distribusi produksi luas | Uji perangkat kelas rendah, e2e per role, monitoring terkontrol, audit dependensi dan pentest |

Versi terbaru harus dipilih bersama kompatibilitas, kebutuhan nyata, dan hasil pengujian. Menambah semua library modern sekaligus tidak menjamin aplikasi lebih ringan atau lebih aman.
