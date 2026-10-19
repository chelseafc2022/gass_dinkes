"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/gass/providers";
import { write } from "@/lib/api";

type Credentials = {
  identifier: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof Credentials, string>>;

function GovernmentIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "gass-agency gass-agency--compact" : "gass-agency"}>
      <div className="gass-agency__marks">
        <Image
          src="/branding/logo-konsel.png"
          alt="Lambang Kabupaten Konawe Selatan"
          width={678}
          height={800}
          className="gass-agency__crest"
          priority
        />
        <span className="gass-agency__divider" aria-hidden="true" />
        <Image
          src="/branding/kemenkes_logo.webp"
          alt="Kementerian Kesehatan Republik Indonesia"
          width={3840}
          height={1739}
          className="gass-agency__kemenkes"
          priority
        />
      </div>
      <div>
        <span>Dinas Kesehatan</span>
        <small>Kabupaten Konawe Selatan</small>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: (credentials: Credentials) =>
      write("/auth/login", credentials, "POST"),
    onSuccess: (response) => {
      queryClient.setQueryData(["me"], response.user);
      router.replace("/dashboard");
    },
  });

  const clearFieldError = (field: keyof Credentials) => {
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (login.error) login.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = {
      identifier: String(data.get("identifier") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    };
    const errors: FieldErrors = {};

    if (!credentials.identifier) {
      errors.identifier = "Username wajib diisi.";
    }
    if (!credentials.password) {
      errors.password = "Password wajib diisi.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    login.mutate(credentials);
  };

  return (
    <form className="gass-login-form" onSubmit={handleSubmit} noValidate>
      <div className="gass-field">
        <label htmlFor="identifier">Username</label>
        <div className="gass-input-wrap">
          <UserRound aria-hidden="true" />
          <input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="Masukkan username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(fieldErrors.identifier)}
            aria-describedby={fieldErrors.identifier ? "identifier-error" : undefined}
            onChange={() => clearFieldError("identifier")}
          />
        </div>
        {fieldErrors.identifier && (
          <p id="identifier-error" className="gass-field-error">
            {fieldErrors.identifier}
          </p>
        )}
      </div>

      <div className="gass-field">
        <label htmlFor="password">Password</label>
        <div className="gass-input-wrap">
          <LockKeyhole aria-hidden="true" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Masukkan password"
            autoComplete="current-password"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            onChange={() => clearFieldError("password")}
          />
          <button
            type="button"
            className="gass-password-toggle"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="gass-field-error">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {login.error && (
        <div className="gass-server-error" role="alert">
          <AlertCircle aria-hidden="true" />
          <p>
            <strong>Login belum berhasil</strong>
            <span>{login.error.message}</span>
          </p>
        </div>
      )}

      <button
        type="submit"
        className="gass-submit"
        disabled={login.isPending}
      >
        {login.isPending ? (
          <>
            <LoaderCircle className="gass-spinner" aria-hidden="true" />
            Memverifikasi akun…
          </>
        ) : (
          <>
            Masuk
            <LogIn aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  return (
    <main className="gass-login-page">
      <section className="gass-brand-panel" aria-label="Tentang GASS">
        <div className="gass-office-photo">
          <Image
            src="/branding/foto-kantor.jpeg"
            alt="Kantor Dinas Kesehatan Kabupaten Konawe Selatan"
            fill
            sizes="(min-width: 1181px) 55vw, (min-width: 900px) 48vw, 1px"
          />
        </div>
        <div className="gass-brand-glow" aria-hidden="true" />
        <div className="gass-dot-grid gass-dot-grid--top" aria-hidden="true" />
        <div className="gass-dot-grid gass-dot-grid--bottom" aria-hidden="true" />
        <div className="gass-medical-mark gass-medical-mark--one" aria-hidden="true">+</div>
        <div className="gass-medical-mark gass-medical-mark--two" aria-hidden="true">+</div>
        <Leaf className="gass-leaf gass-leaf--one" aria-hidden="true" />
        <Leaf className="gass-leaf gass-leaf--two" aria-hidden="true" />

        <div className="gass-brand-panel__content">
          <div className="gass-brand-copy">
            <Image
              src="/branding/logo-gass.png"
              alt="GASS — Gerak Aksi Sehat Setara"
              width={1312}
              height={1199}
              className="gass-main-logo"
              priority
            />
            <p>
              Model Inovasi Tata Kelola Pelayanan Kesehatan Berbasis
              Kolaborasi untuk Percepatan Standar Pelayanan Minimal (SPM)
              Bidang Kesehatan
            </p>
          </div>

        </div>

        <svg
          className="gass-waves"
          viewBox="0 0 1000 190"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 120C170 55 272 180 447 119C616 60 725 35 1000 112V190H0Z" fill="#D1FAE5" fillOpacity=".62" />
          <path d="M0 148C181 88 305 205 497 137C680 73 823 85 1000 134V190H0Z" fill="#10B981" fillOpacity=".38" />
          <path d="M0 171C201 114 328 215 526 158C710 106 841 124 1000 151V190H0Z" fill="#064E3B" fillOpacity=".96" />
          <path d="M284 179C430 128 552 193 702 160C787 141 884 140 1000 167V190H277Z" fill="#DB2777" fillOpacity=".88" />
        </svg>
      </section>

      <section className="gass-form-panel">
        <div className="gass-mobile-brand">
          <Image
            src="/branding/logo-gass.png"
            alt="GASS — Gerak Aksi Sehat Setara"
            width={1312}
            height={1199}
            priority
          />
        </div>

        <div className="gass-login-card">
          <GovernmentIdentity compact />

          <div className="gass-heading">
            <span className="gass-kicker">Portal Monitoring Kesehatan</span>
            <h1>Selamat Datang</h1>
            <p>Masuk untuk mengakses sistem GASS</p>
          </div>

          <LoginForm />

          <div className="gass-access-note">
            <ShieldCheck aria-hidden="true" />
            <p>
              Akses diberikan oleh Admin Dinkes. Jika mengalami kendala akun,
              hubungi administrator instansi Anda.
            </p>
          </div>

          <div className="gass-setara-brand">
            <Link href="/#profil" className="gass-profile-link">
              <ArrowLeft aria-hidden="true" />
              Profil GASS
            </Link>
            <Image
              src="/branding/new_logo_Setara.png"
              alt="Logo SETARA"
              width={160}
              height={52}
              className="gass-setara-logo"
            />
          </div>
        </div>

        <p className="gass-copyright">
          © {new Date().getFullYear()} Dinas Kesehatan Kabupaten Konawe Selatan
        </p>
      </section>
    </main>
  );
}
