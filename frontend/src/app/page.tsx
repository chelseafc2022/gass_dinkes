import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3,
  Check, ClipboardCheck, Database, FileText, HeartHandshake,
  HeartPulse, MapPin, ShieldCheck, UsersRound,
} from "lucide-react";
import { LandingHeader } from "@/components/gass/landing-header";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Gerak Aksi Sehat Setara · Konawe Selatan",
  description: "Kenali GASS, inovasi tata kelola pelayanan kesehatan berbasis kolaborasi yang diinisiasi Nurlita Jaya AS untuk percepatan SPM bidang kesehatan di Kabupaten Konawe Selatan.",
};

const principles = [
  { icon: UsersRound, title: "Bergerak bersama", text: "Pemerintah daerah, puskesmas, desa, kader, dan masyarakat mengambil peran dalam pelayanan kesehatan." },
  { icon: HeartHandshake, title: "Menjangkau lebih dekat", text: "Penjangkauan aktif memberi perhatian pada warga yang belum terlayani, kelompok rentan, dan wilayah sulit akses." },
  { icon: BarChart3, title: "Bertindak berbasis data", text: "Data sasaran dan capaian menjadi dasar menentukan prioritas, memantau tindak lanjut, serta mengevaluasi layanan." },
];

const workflow = [
  { icon: Database, title: "Tetapkan arah", role: "Admin Dinas Kesehatan", text: "Susun program, kegiatan, indikator, target, dan periode pelaporan sebagai acuan bersama." },
  { icon: ClipboardCheck, title: "Laporkan capaian", role: "Operator fasilitas kesehatan", text: "Catat realisasi kinerja dan keuangan sesuai fasilitas kesehatan serta periode yang tersedia." },
  { icon: ShieldCheck, title: "Verifikasi & bina", role: "Bidang penanggung jawab", text: "Tinjau laporan, periksa capaian, dan lakukan koreksi serta pembinaan sesuai kewenangan." },
  { icon: BarChart3, title: "Pantau & tindak lanjuti", role: "Pimpinan & Dinas Kesehatan", text: "Gunakan dashboard SPM, IKU, dan keuangan untuk evaluasi serta penentuan langkah perbaikan." },
];

const leaders = [
  { image: "irham-kalenggo-2026.webp", name: "Irham Kalenggo, S.Sos., M.Si.", role: "Bupati Konawe Selatan", description: "Arah kebijakan pembangunan daerah", width: 720, height: 960 },
  { image: "wahyu-ade-pratama-imran-2026.webp", name: "Wahyu Ade Pratama Imran, S.H.", role: "Wakil Bupati Konawe Selatan", description: "Sinergi penyelenggaraan pemerintahan", width: 720, height: 960 },
  { image: "ichsan-porosi-2026.webp", name: "Ichsan Porosi, S.T., M.P.T.", role: "Sekretaris Daerah", description: "Koordinasi lintas perangkat daerah", width: 720, height: 960 },
];

function SectionHeading({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}><span />{label}</p>
      <h2>{title}</h2>
      {children && <p className={styles.sectionDescription}>{children}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.landing} id="beranda">
      <a className={styles.skipLink} href="#konten">Langsung ke konten</a>
      <LandingHeader />
      <main id="konten">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.heroBadge}><span />Inovasi kesehatan · Konawe Selatan</p>
              <p className={styles.heroKicker}>GERAK AKSI SEHAT SETARA</p>
              <h1 id="hero-title">Bergerak bersama.<br />Sehat lebih <em>setara.</em></h1>
              <p className={styles.heroDescription}>Menyatukan langkah, mendekatkan layanan. GASS menggerakkan kolaborasi untuk mempercepat pemenuhan Standar Pelayanan Minimal bidang kesehatan di Kabupaten Konawe Selatan.</p>
              <div className={styles.actions}>
                <Link href="/login" className={styles.primaryButton}>Masuk ke GASS <ArrowUpRight size={18} aria-hidden="true" /></Link>
                <a href="#profil" className={styles.textButton}>Kenali inovasinya <ArrowDown size={17} aria-hidden="true" /></a>
              </div>
              <div className={styles.heroNote}>
                <span className={styles.noteIcon}><HeartPulse size={21} aria-hidden="true" /></span>
                <p>Pelayanan yang aktif.<br /><strong>Akses yang lebih berkeadilan.</strong></p>
              </div>
            </div>
            <figure className={styles.initiator}>
              <div className={styles.portraitBackdrop} aria-hidden="true"><div className={styles.orbit} /><span className={styles.decorativeCross}>+</span><span className={styles.dotPattern} /></div>
              <div className={styles.heroLogo}><Image src="/branding/logo-gass.png" alt="GASS — Gerak Aksi Sehat Setara" width={1312} height={1199} sizes="120px" priority /></div>
              <Image src="/landing/nurlita.webp" alt="Nurlita Jaya AS, S.Sos., M.Kes., Kepala Dinas Kesehatan Kabupaten Konawe Selatan dan inisiator GASS" width={1000} height={1021} priority sizes="(max-width: 640px) 90vw, (max-width: 1000px) 560px, 46vw" className={styles.portrait} />
              <figcaption className={styles.initiatorCaption}>
                <span className={styles.initiatorLabel}><span />INISIATOR GASS</span>
                <h2>Nurlita Jaya AS, <small>S.Sos., M.Kes.</small></h2>
                <p>Kepala Dinas Kesehatan<br />Kabupaten Konawe Selatan</p>
              </figcaption>
            </figure>
          </div>
        </section>
        <div className={styles.scopeBand}>
          <div className={`${styles.container} ${styles.scopeGrid}`}>
            <p className={styles.scopeIntro}>Satu gerakan.<br /><strong>Tujuan bersama.</strong></p>
            <div><strong>12</strong><p>Pelayanan dasar SPM<span>Fokus pemenuhan layanan</span></p></div>
            <div><strong>15</strong><p>Subinovasi kesehatan<span>Terhubung dalam GASS</span></p></div>
            <div><HeartHandshake size={36} strokeWidth={1.4} aria-hidden="true" /><p>Kolaborasi lintas sektor<span>Dari kabupaten hingga desa</span></p></div>
          </div>
        </div>
        <section id="profil" className={`${styles.section} ${styles.container}`} aria-labelledby="profile-title">
          <div className={styles.profileGrid}>
            <div className={styles.profileVisual}>
              <Image src="/branding/foto-kantor.jpeg" alt="Kantor Dinas Kesehatan Kabupaten Konawe Selatan" fill sizes="(max-width: 900px) 90vw, 43vw" className={styles.officePhoto} />
              <div className={styles.photoCaption}><MapPin size={18} aria-hidden="true" /><div>Dinas Kesehatan<span>Kabupaten Konawe Selatan</span></div></div>
              <div className={styles.profileStamp}><HeartPulse size={26} aria-hidden="true" /><span>Dekat dengan warga.<br /><strong>Nyata dalam aksi.</strong></span></div>
            </div>
            <div className={styles.profileCopy}>
              <div className={styles.profileSetara}>
                <Image
                  src="/branding/new_logo_Setara.png"
                  alt="SETARA — Sehat, Cerdas dan Sejahtera"
                  width={8042}
                  height={4157}
                  sizes="150px"
                />
              </div>
              <p className={styles.eyebrow}><span />PROFIL INOVASI GASS</p>
              <h2 id="profile-title">Layanan kesehatan<br />yang bergerak menjangkau.</h2>
              <p>GASS adalah model inovasi tata kelola pelayanan kesehatan berbasis kolaborasi. Pemerintah daerah, puskesmas, desa, dan masyarakat bekerja bersama agar setiap sasaran ditemukan, dilayani, dipantau, dan ditindaklanjuti.</p>
              <p>Diinisiasi oleh <strong>Nurlita Jaya AS, S.Sos., M.Kes.</strong>, GASS memadukan aksi lapangan dengan dukungan digital untuk memperkuat koordinasi, pemantauan kinerja, dan pemerataan akses layanan.</p>
              <ul className={styles.checkList}>
                <li><Check size={17} aria-hidden="true" />Pelayanan aktif berbasis keluarga dan wilayah</li>
                <li><Check size={17} aria-hidden="true" />Perhatian pada kelompok rentan dan sulit akses</li>
                <li><Check size={17} aria-hidden="true" />Tindak lanjut terukur dan evaluasi berkelanjutan</li>
              </ul>
              <a href="#dokumen" className={styles.textButton}>Pelajari profil lengkap <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.principles}>
            {principles.map(({ icon: Icon, title, text }, index) => (
              <article className={styles.principle} key={title}>
                <div className={styles.principleTop}><span className={styles.featureIcon}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span><span>0{index + 1}</span></div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="kolaborasi" className={styles.collaboration} aria-label="Kolaborasi pemerintah daerah">
          <div className={styles.container}>
            <div className={styles.collaborationHeading}>
              <SectionHeading label="KOLABORASI UNTUK KONAWE SELATAN" title="Kesehatan adalah kerja bersama.">Kepemimpinan daerah dan koordinasi lintas sektor menjadi bagian dari tata kelola GASS, dengan Dinas Kesehatan sebagai penggerak pelaksanaan.</SectionHeading>
              <Image src="/branding/logo-setara.png" alt="Logo Setara" width={10399} height={3404} sizes="(max-width: 600px) 85px, 160px" className={styles.setaraLogo} />
            </div>
            <div className={styles.leaderGrid}>
              {leaders.map((leader) => (
                <figure key={leader.role} className={styles.leader}>
                  <div className={styles.leaderPortrait}><Image src={`/landing/${leader.image}`} alt={`${leader.name}, ${leader.role}`} width={leader.width} height={leader.height} sizes="(max-width: 600px) 84vw, 30vw" loading="eager" unoptimized /></div>
                  <figcaption><span className={styles.leaderRole}>{leader.role}</span><h3>{leader.name}</h3><p>{leader.description}</p></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        <section id="alur" className={`${styles.section} ${styles.container}`} aria-label="Alur sistem GASS">
          <div className={styles.workflowHeading}>
            <SectionHeading label="DARI AKSI MENJADI INFORMASI" title="Terhubung dalam satu alur.">Sistem GASS membantu tim mengelola pelaporan kinerja dan keuangan, dari fasilitas kesehatan hingga pengambilan keputusan di tingkat kabupaten.</SectionHeading>
            <span className={styles.systemBadge}><span />Sistem monitoring GASS</span>
          </div>
          <ol className={styles.workflow}>
            {workflow.map(({ icon: Icon, title, role, text }, index) => (
              <li key={title}>
                <div className={styles.stepTop}><span className={styles.stepNumber}>0{index + 1}</span><Icon size={25} strokeWidth={1.5} aria-hidden="true" /></div>
                <p className={styles.stepRole}>{role}</p><h3>{title}</h3><p className={styles.stepText}>{text}</p>
              </li>
            ))}
          </ol>
          <div className={styles.workflowFootnote}><ShieldCheck size={18} aria-hidden="true" /><p>Akses dan kewenangan disesuaikan dengan peran pengguna serta fasilitas kesehatan.</p></div>
        </section>
        <section id="dokumen" className={styles.resources} aria-label="Dokumen inovasi">
          <div className={`${styles.container} ${styles.resourceGrid}`}>
            <SectionHeading label="KENALI LEBIH JAUH" title="Landasan gerak, panduan aksi.">Pelajari konsep, tujuan, dan pedoman implementasi GASS melalui dokumen inovasi.</SectionHeading>
            <div className={styles.documentList}>
              <a href="/documents/profil-inovasi-gass.pdf" download className={styles.documentLink}><span className={styles.documentIcon}><FileText size={24} aria-hidden="true" /></span><span><strong>Profil Inovasi GASS</strong><small>Profil dan pedoman implementasi · PDF</small></span><ArrowDownToLine size={19} aria-hidden="true" /></a>
              <a href="/documents/gerak-aksi-sehat-setara.docx" download className={styles.documentLink}><span className={styles.documentIcon}><FileText size={24} aria-hidden="true" /></span><span><strong>Gerak Aksi Sehat Setara</strong><small>Konsep inovasi dan pedoman kerja · DOCX</small></span><ArrowDownToLine size={19} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
        <section className={`${styles.container} ${styles.ctaSection}`} aria-label="Masuk ke sistem GASS">
          <div className={styles.cta}>
            <div className={styles.ctaDecoration} aria-hidden="true" />
            <div><p className={styles.eyebrow}><span />BERSAMA, WUJUDKAN LAYANAN SETARA</p><h2>Langkah kecil hari ini.<br />Layanan lebih baik esok hari.</h2><p>Kelola capaian, pantau perkembangan, dan tindak lanjuti pelayanan melalui GASS.</p></div>
            <Link href="/login" className={styles.lightButton}>Masuk ke aplikasi <ArrowUpRight size={19} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerMain}`}>
          <a href="#beranda" className={styles.footerBrand} aria-label="Kembali ke beranda GASS"><Image src="/branding/logo-gass.png" alt="GASS" width={1312} height={1199} sizes="70px" /><span><strong>Gerak Aksi Sehat Setara</strong><small>Dinas Kesehatan Kabupaten Konawe Selatan</small></span></a>
          <nav aria-label="Navigasi footer"><a href="#profil">Profil inovasi</a><a href="#alur">Alur sistem</a><Link href="/login">Masuk <ArrowUpRight size={14} aria-hidden="true" /></Link></nav>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}><p>© {new Date().getFullYear()} GASS. Dinas Kesehatan Kabupaten Konawe Selatan.</p><span><MapPin size={13} aria-hidden="true" />Konawe Selatan, Sulawesi Tenggara</span></div>
      </footer>
    </div>
  );
}
