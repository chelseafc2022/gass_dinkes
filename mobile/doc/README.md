# Dokumentasi GASS Mobile

Dokumentasi teknis untuk pengembang dan pengelola aplikasi mobile GASS — Gerak Aksi Sehat Setara, Dinas Kesehatan Kabupaten Konawe Selatan.

Disusun pada **23 Oktober 2026**, berdasarkan kode dan konfigurasi project. Versi terpasang mengacu pada `package-lock.json`; informasi produk eksternal dapat berubah.

| Dokumen | Isi | Pembaca utama |
| --- | --- | --- |
| [01 — Teknologi yang digunakan](01-teknologi.md) | Daftar dependensi, fungsi, struktur aplikasi, caching, penyimpanan dan keamanan | Pengembang dan tim TI |
| [02 — Langkah instalasi](02-instalasi.md) | Persiapan, konfigurasi API, Android/iOS, build EAS, pemeriksaan dan troubleshooting | Pengembang baru dan pengelola build |
| [03 — Alasan dan perbandingan](03-alasan-dan-perbandingan.md) | Alasan pemilihan, alternatif sejenis, kekurangan, dan kapan perlu beralih | Pengambil keputusan dan pengembang |

Mulai dari dokumen instalasi untuk menjalankan project. Baca dokumen teknologi dan perbandingan untuk memahami keputusan arsitekturnya.

Folder aplikasi berada di `gass/mobile`. Panduan backend tetap berada di [README GASS](../../README.md). Ringkasan aplikasi dan catatan kesiapan rilis ada di [README mobile](../README.md).

Dokumentasi ini tidak menyatakan aplikasi telah lulus pentest, profiling perangkat, atau uji operasional. Hasil bundling JavaScript/Hermes berbeda dengan APK/IPA yang sudah ditandatangani dan diuji di HP.
