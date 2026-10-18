# Pedoman Proyek GASS

GASS — Gerak Aksi Sehat Setara adalah sistem monitoring kinerja dan pelayanan kesehatan Dinas Kesehatan Kabupaten Konawe Selatan.

## Identitas visual dan warna dasar

Gunakan identitas **Modern Healthcare Government Dashboard**: profesional, bersih, elegan, mudah dibaca, dan responsif. Palet proyek mengikuti logo GASS terakhir yang disediakan pengguna, dengan Emerald Green, Deep Teal, Soft Mint, dan aksen Magenta.

| Warna | Nilai | Penggunaan |
| --- | --- | --- |
| Deep Emerald | `#064E3B` | Identitas utama, tombol login, dan aksi utama |
| Deep Teal | `#0F766E` | Gradient background dan elemen dekoratif |
| Soft Mint | `#D1FAE5` | Area latar belakang lembut |
| Magenta | `#DB2777` | Aksen kecil; bukan warna dominan |
| Background | `#F4FBF8` | Latar halaman |
| Card Login / Putih | `#FFFFFF` | Card login agar bersih dan mudah dibaca |
| Dark Text | `#134E4A` | Teks utama |
| Border | `#E2E8F0` | Garis pembatas dan border komponen |

Gunakan CSS variables sebagai sumber warna yang konsisten:

```css
--primary: #064E3B;
--primary-light: #0F766E;
--mint: #D1FAE5;
--accent: #DB2777;
--background: #F4FBF8;
--white: #FFFFFF;
--text-primary: #134E4A;
--border: #E2E8F0;
```

Warna pendukung dari brief awal: `--secondary: #10B981` (Emerald Green) dan `--text-secondary: #64748B` (teks sekunder). Gunakan sesuai kebutuhan tanpa menggeser palet utama di atas.

## Aturan penerapan

- Pertahankan bentuk, proporsi, transparansi, dan warna asli logo GASS serta lambang Kabupaten Konawe Selatan. Jangan menggambar ulang atau mewarnai ulang lambang pemerintah.
- Gunakan Emerald untuk tombol login dan identitas utama, Teal untuk gradient serta dekorasi, Mint untuk latar lembut, dan Magenta hanya sebagai aksen kecil.
- Gunakan putih untuk card login dengan teks yang kontras dan mudah dibaca. Jangan menggunakan aksen Magenta sebagai latar dominan.
- Pastikan teks, tombol, focus state, dan pesan validasi tetap terbaca; jangan mengandalkan warna saja untuk menyampaikan status.
- Ikuti framework, styling, routing, dan komponen yang sudah digunakan proyek. Saat menerapkan palet, perhatikan token tema yang sudah ada agar perubahan tetap sesuai lingkup tugas.
- Pertahankan mekanisme autentikasi yang tersedia. Jangan menambahkan SSO, API, kredensial, atau tautan pemulihan akun tanpa dukungan alur yang nyata.
- Jika menampilkan kantor instansi, gunakan foto asli yang disediakan pengguna; jangan mengklaim gedung fiktif sebagai kantor resmi.

## Keamanan dan Kesiapan Penetrasi Tes (Pentest Readiness)

Sistem GASS dilengkapi agent spesialis keamanan di `.agents/agents/security-auditor.md`. Seluruh kode harus mematuhi standar keamanan:
- **Zero Exposed Secrets**: Dilarang keras melakukan commit atau menyertakan password, JWT secret, private key, atau database credential di dalam source code repository.
- **OWASP Top 10 Hardened**: Validasi input ketat (Prisma ORM parameterized queries, helmet security headers, XSS sanitization, RBAC authorization di setiap endpoint).
- **Proteksi Brute-Force & Session**: Rate limiting pada `/auth/login`, cookie autentikasi wajib `httpOnly`, `Secure`, dan `SameSite`.
- **Error Sanitization**: Jangan pernah membocorkan stack trace, database error, atau internal exception ke response client publik.

