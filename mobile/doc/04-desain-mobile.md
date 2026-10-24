# Desain antarmuka mobile

Tema mengikuti frontend/src/app/globals.css: Emerald #064E3B, Teal #0F766E, Mint #D1FAE5, aksen Magenta #DB2777, latar #F4FBF8, teks #134E4A dan border dashboard #DDEBE5.

Sumber token: src/core/theme.ts. Komponen bersama: src/components/ui.tsx. Gunakan font sistem agar ringan, dengan hierarki judul, label, dan teks pendukung yang konsisten.

Aset logo GASS, lambang Konawe Selatan, Kemenkes, dan foto kantor berasal dari frontend/public/branding dan disimpan lokal di assets. Logo menggunakan contentFit contain, tanpa perubahan warna atau proporsi. Foto kantor hanya muncul pada login.

- Login: identitas pemerintah, foto kantor, formulir putih, fokus input, dan kontrol visibilitas kata sandi.
- Dashboard: ringkasan kinerja, kartu verifikasi dan serapan, filter yang dapat dibuka, status indikator dan rincian tren.
- Laporan dan verifikasi: filter dalam kartu, status berlabel, nilai dan aksi yang terpisah jelas.
- Draf: jumlah draf, informasi masa simpan, kondisi kosong, aksi tinjau dan hapus dengan konfirmasi.
- Akun: inisial pengguna, peran, informasi privasi, dan konfirmasi keluar.
- Formulir: bagian identitas, nilai, dan penyimpanan; validasi dan pemeriksaan kewenangan tetap berlaku.

Semua ikon antarmuka menggunakan komponen resmi `lucide-react-native`, dirender oleh `react-native-svg`. Impor ikon secara eksplisit melalui komponen Icon di src/components/ui.tsx; jangan mengimpor seluruh katalog ikon. Ukuran default 22 dan strokeWidth 1.8. Logo resmi tetap memakai aset gambar asli. Setelah instalasi pertama react-native-svg, development build Android/iOS harus dibangun ulang. Referensi: https://lucide.dev/guide/react-native. Daftar tetap memakai FlashList dan cache data tetap mengikuti implementasi React Query yang tersedia.

Proteksi tangkapan layar tetap aktif. Pemeriksaan visual halaman yang memerlukan autentikasi dilakukan langsung pada emulator dengan akun yang berwenang.

## Kepadatan dashboard dan profil

Dashboard memakai judul 22, angka KPI 26, teks isi 12–14, kartu dengan padding 14 dan radius 16. Empat KPI menggunakan dua kolom dan dapat membungkus pada layar sempit. Detail indikator dan filter dibuka sesuai kebutuhan; nilai keuangan lengkap tetap tersedia. Profil menggunakan avatar 48, identitas horizontal, baris informasi dengan ikon Lucide, serta rincian privasi yang dapat dilipat. Ukuran sentuh kontrol tetap minimal 44–48 dan pembesaran teks sistem tetap aktif.

## Revisi login satu layar dan kartu ringkas

Login tidak menggunakan ScrollView: logo GASS terpusat dan diperbesar di bagian header, foto kantor sebagai latar samar, kartu login dengan kolom input dan aksi visibilitas kata sandi, serta logo Kemenkes dan informasi versi aplikasi di bagian footer. Saat keyboard terbuka, identitas atas dan footer disembunyikan otomatis agar form login tetap terpusat dan terjangkau tanpa terpotong. Komponen kartu bersama memakai padding 12, radius 14, dan jarak isi 8; judul halaman 20. Filter laporan/verifikasi dilipat secara default.

Kolom kata sandi menonaktifkan kapitalisasi dan koreksi otomatis. Spasi di awal/akhir diberi peringatan dengan aksi eksplisit untuk menghapusnya; password tidak diubah diam-diam. Error login dibedakan dari sesi kedaluwarsa dan gangguan layanan identitas.
