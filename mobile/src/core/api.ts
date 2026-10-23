export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export function apiBase() {
  if (!configured)
    throw new Error(
      "Isi EXPO_PUBLIC_API_URL di mobile/.env sebelum menjalankan aplikasi.",
    );
  const url = new URL(configured);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (!__DEV__ && url.protocol !== "https:") ||
    !["https:", "http:"].includes(url.protocol)
  )
    throw new Error("Alamat API tidak valid. Produksi wajib HTTPS.");
  return configured;
}
let refresh: Promise<boolean> | null = null;
let generation = 0;
let expired = () => {};
export const onSessionExpired = (fn: () => void) => {
  expired = fn;
  return () => {
    expired = () => {};
  };
};
export function resetRequests() {
  generation++;
}
async function request(path: string, init: RequestInit) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init.signal?.addEventListener("abort", cancel, { once: true });
  if (init.signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, 20000);
  try {
    return await fetch(`${apiBase()}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Gass-Client": "web",
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", cancel);
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const start = generation;
  let response = await request(path, init);
  if (
    response.status === 401 &&
    !["/auth/login", "/auth/refresh", "/auth/logout"].includes(path)
  ) {
    if (start === generation) {
      refresh ??= request("/auth/refresh", { method: "POST" })
        .then((r) => {
          if (r.ok) generation++;
          return r.ok;
        })
        .finally(() => {
          refresh = null;
        });
      if (await refresh) response = await request(path, init);
    } else response = await request(path, init);
    if (response.status === 401) expired();
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Data tidak valid. Periksa isian.",
      401: "Sesi berakhir atau akun tidak valid. Silakan masuk kembali.",
      403: "Akses ditolak, periode tertutup, atau bulan sudah dikunci.",
      409: "Laporan berubah sejak dibuka. Muat ulang sebelum menyimpan.",
      429: "Terlalu banyak permintaan. Tunggu satu menit.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ?? "Layanan belum tersedia. Silakan coba lagi.",
    );
  }
  return response.json() as Promise<T>;
}
export const write = <T>(path: string, body: unknown, method = "PUT") =>
  api<T>(path, { method, body: JSON.stringify(body) });
export const errorText = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : e instanceof Error && !/fetch|network|abort/i.test(e.message)
      ? e.message
      : "Koneksi terputus atau waktu tunggu habis. Periksa data server sebelum mencoba lagi.";
