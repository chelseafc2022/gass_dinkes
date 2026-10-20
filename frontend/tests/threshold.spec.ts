import { expect, test, Page } from "@playwright/test";

const defaults = [1, 2, 3, 4].map((triwulan) => ({
  triwulan,
  hijauMin: 100,
  kuningMin: triwulan === 4 ? null : triwulan * 25,
}));

async function mockApi(page: Page, role = "ADMIN_DINKES") {
  let rules = defaults.map((rule) => ({ ...rule }));
  const writes: unknown[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me")
      return route.fulfill({
        json: {
          id: "threshold-ui-test",
          name: "Pengguna Uji",
          role,
          faskesId: null,
          bidangId: null,
          permissions: [
            "dashboard",
            "capaian_kinerja",
            ...(role === "ADMIN_DINKES" ? ["master_threshold"] : []),
          ],
        },
      });
    if (url.pathname === "/api/options")
      return route.fulfill({ json: { faskes: [], bidang: [] } });
    if (url.pathname === "/api/master/threshold") {
      if (route.request().method() === "PUT") {
        const payload = route.request().postDataJSON();
        writes.push(payload);
        rules = payload.rules;
      }
      return route.fulfill({ json: { rules } });
    }
    if (["/api/dashboard", "/api/capaian/kinerja"].includes(url.pathname)) {
      const bulan = Number(url.searchParams.get("bulan"));
      const triwulan = bulan
        ? Math.ceil(bulan / 3)
        : Number(url.searchParams.get("triwulan")) || 4;
      return route.fulfill({
        json: {
          tahun: 2026,
          threshold: rules[triwulan - 1],
          cumulativeThrough: bulan || triwulan * 3,
          thresholdRules: rules,
          data: [],
          available: [],
          indicators: [],
          programs: [],
          settings: { isOtomatisAktif: false },
          months: Array.from({ length: 12 }, (_, i) => ({
            bulan: i + 1,
            open: true,
          })),
          summary: {
            faskes: 0,
            indikator: 0,
            capaian: 0,
            targetKeuangan: 0,
            realisasiKeuangan: 0,
            serapan: 0,
            tervalidasi: 0,
            jumlahLaporan: 0,
          },
        },
      });
    }
    return route.fulfill({
      status: 503,
      json: { message: "Di luar lingkup pengujian." },
    });
  });
  return writes;
}

test("admin edits global rules, validates ranges and persists without yellow in IV", async ({
  page,
}) => {
  const writes = await mockApi(page);
  await page.goto("/master/threshold");
  await expect(
    page.getByRole("heading", { name: "Threshold triwulan", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#yellow-4")).toBeDisabled();
  await page.locator("#yellow-2").fill("100");
  await page.getByRole("button", { name: "Simpan threshold" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Batas kuning" }),
  ).toBeVisible();
  expect(writes).toHaveLength(0);
  await page.locator("#yellow-2").fill("55");
  await page.getByRole("button", { name: "Simpan threshold" }).click();
  await expect(
    page.getByText("Threshold triwulan berhasil disimpan."),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      rules: defaults.map((r) =>
        r.triwulan === 2 ? { ...r, kuningMin: 55 } : r,
      ),
    },
  ]);
  await page.reload();
  await expect(page.locator("#yellow-2")).toHaveValue("55");
  await page.screenshot({
    path: "test-results/threshold-master-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/threshold-master-mobile.png",
    fullPage: true,
  });
});

test("operator cannot open the threshold editor", async ({ page }) => {
  await mockApi(page, "OPERATOR_PUSKESMAS");
  await page.goto("/master/threshold");
  await expect(
    page.getByRole("button", { name: "Simpan threshold" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Threshold triwulan", exact: true }),
  ).toHaveCount(0);
});

