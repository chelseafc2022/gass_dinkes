export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let refresh: Promise<boolean> | null = null;
let authGeneration = 0;
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const run = () =>
    fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Gass-Client": "web",
        ...options.headers,
      },
    });
  const requestGeneration = authGeneration;
  let response = await run();
  const canRefresh = !["/auth/login", "/auth/logout", "/auth/refresh"].includes(
    path,
  );
  if (response.status === 401 && canRefresh) {
    if (requestGeneration !== authGeneration) {
      response = await run();
    } else {
      refresh ??= fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "X-Gass-Client": "web" },
      })
        .then((result) => {
          if (result.ok) authGeneration += 1;
          return result.ok;
        })
        .finally(() => {
          refresh = null;
        });
      if (await refresh) response = await run();
    }
  }
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "Server tidak dapat dihubungi." }));
    throw new ApiError(
      response.status,
      Array.isArray(body.message)
        ? body.message.join(", ")
        : body.message || "Permintaan gagal.",
    );
  }
  return response.json();
}
export const write = (path: string, body: unknown, method = "PUT") =>
  api(path, { method, body: JSON.stringify(body) });
export function queryString(values: Record<string, unknown>) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== "" && v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}
export const number = (n: number, maxDigits = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(n || 0);

export const percent = (n: number, digits = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
export function exportCsv(name: string, headers: string[], rows: unknown[][]) {
  const quote = (v: unknown) => {
    const s = String(v ?? "");
    return (
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
    );
  };
  const blob = new Blob(
    [
      "\uFEFF" +
        [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function shortFaskes(name: string): string {
  if (!name) return "";
  const clean = name.trim();
  if (
    /^(BLUD\s+RSU\s+KONAWE\s+SELATAN|RUMAH\s+SAKIT\s+UMUM\s+DAERAH|RSUD\s+KONAWE\s+SELATAN|RSU\s+KONAWE\s+SELATAN)/i.test(
      clean,
    )
  ) {
    return "RSUD";
  }
  if (/^UPTD\s+PUSKESMAS\s+/i.test(clean)) {
    const pkm = clean.replace(/^UPTD\s+PUSKESMAS\s+/i, "");
    return (
      "PKM " +
      pkm
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  }
  if (/^PUSKESMAS\s+/i.test(clean)) {
    const pkm = clean.replace(/^PUSKESMAS\s+/i, "");
    return (
      "PKM " +
      pkm
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  }
  if (/^RUMAH\s+SAKIT/i.test(clean)) {
    return "RSUD";
  }
  return clean;
}
