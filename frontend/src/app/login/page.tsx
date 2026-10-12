"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  HeartPulse,
  ChartNoAxesCombined,
  Building2,
  LoaderCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/gass/providers";
import { write } from "@/lib/api";
export default function Login() {
  const router = useRouter(),
    client = useQueryClient(),
    { user } = useAuth();
  const [show, setShow] = useState(false);
  const login = useMutation({
    mutationFn: (b: any) => write("/auth/login", b, "POST"),
    onSuccess: (r) => {
      client.setQueryData(["me"], r.user);
      router.replace("/dashboard");
    },
  });
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <section className="login-story hidden lg:flex flex-col justify-between p-14 text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <Activity className="size-8" />
          <span className="text-3xl font-extrabold tracking-tight">GASS.</span>
          <span className="border-l border-white/25 pl-4 ml-2 text-xs leading-5 opacity-80">
            DINAS KESEHATAN
            <br />
            KONAWE SELATAN
          </span>
        </div>
        <div className="relative z-10 max-w-lg">
          <span className="inline-flex rounded-full border border-white/25 px-3 py-1.5 text-[11px] tracking-widest mb-7">
            GERAKAN AKSI SEHAT SETARA
          </span>
          <h1 className="text-5xl xl:text-6xl leading-[1.12] font-semibold tracking-tight">
            Bersama bergerak.
            <br />
            <span className="text-emerald-200">Kesehatan setara.</span>
          </h1>
          <p className="mt-6 text-emerald-50/75 text-sm leading-7 max-w-sm">
            Satu ruang untuk memantau kinerja, mengawal program, dan
            meningkatkan pelayanan kesehatan bagi seluruh masyarakat.
          </p>
          <div className="grid grid-cols-3 gap-5 mt-12 border-t border-white/20 pt-7">
            {[
              [Building2, "Puskesmas terhubung"],
              [ChartNoAxesCombined, "Kinerja terukur"],
              [HeartPulse, "Layanan lebih baik"],
            ].map(([Icon, text]: any) => (
              <div key={text}>
                <Icon className="size-6 text-emerald-200 mb-3" />
                <p className="text-xs opacity-85">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-[11px] text-white/55">
          Dinas Kesehatan Kabupaten Konawe Selatan
        </p>
        <div className="login-orbit" />
        <div className="login-orbit second" />
      </section>
      <section className="flex flex-col min-h-screen justify-between p-7 sm:p-12 bg-card">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold lg:invisible text-primary">
            GASS.
          </span>
          <span className="text-[11px] text-muted-foreground">
            Portal monitoring kesehatan
          </span>
        </div>
        <div className="w-full max-w-sm mx-auto py-12">
          <div className="brand-icon mb-7">
            <ShieldCheck className="size-6" />
          </div>
          <p className="eyebrow">SELAMAT DATANG KEMBALI</p>
          <h2 className="text-3xl font-semibold tracking-tight mt-2">
            Masuk ke GASS
          </h2>
          <p className="text-sm text-muted-foreground leading-6 mt-3 mb-8">
            Gunakan akun eGov / Simpeg Anda untuk mengakses ruang kerja Dinas
            Kesehatan.
          </p>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              login.mutate({
                identifier: d.get("identifier"),
                password: d.get("password"),
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="identifier">NIP atau username</Label>
              <Input
                id="identifier"
                name="identifier"
                placeholder="Masukkan NIP atau username"
                autoComplete="username"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  placeholder="Masukkan kata sandi eGov"
                  autoComplete="current-password"
                  required
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  aria-label={
                    show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {show ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>
            {login.error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive"
              >
                {login.error.message}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <LoaderCircle className="animate-spin size-4" />
              ) : (
                <>
                  Masuk ke ruang kerja
                  <ArrowRight className="ml-auto size-4" />
                </>
              )}
            </Button>
          </form>
          <div className="mt-7 flex items-start gap-3 rounded-lg bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 mt-0.5" />
            <p>
              Akses diberikan oleh Admin Dinkes. Jika belum memiliki akses,
              hubungi administrator instansi Anda.
            </p>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} GASS · Gerakan Aksi Sehat Setara
        </p>
      </section>
    </div>
  );
}
