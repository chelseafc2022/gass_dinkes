import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 text-center">
      <h1 className="text-3xl font-semibold">Halaman tidak ditemukan</h1>
      <Link href="/dashboard" className="text-primary underline">
        Kembali ke dashboard
      </Link>
    </main>
  );
}
