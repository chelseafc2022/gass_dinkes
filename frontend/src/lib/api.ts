export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let refresh: Promise<Response> | null = null;
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
  let response = await run();
  if (response.status === 401 && !path.startsWith("/auth/")) {
    refresh ??= fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "X-Gass-Client": "web" },
    }).finally(() => {
      refresh = null;
    });
    if ((await refresh).ok) response = await run();
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
export const number = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n || 0);
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
