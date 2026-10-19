import { expect, test } from "@playwright/test";

const longName = "Pelayanan kesehatan masyarakat dan peningkatan mutu fasilitas kesehatan di seluruh wilayah Kabupaten Konawe Selatan ".repeat(4);
const indicators = [
  { id: "spm", namaIndikator: longName, kategoriIndikator: "SPM" },
  { id: "iku", namaIndikator: "Indikator utama", kategoriIndikator: "IKU" },
];
const activities = [
  { id: "spm", namaSubKegiatan: longName, indikator: [{ kategoriIndikator: "SPM" }] },
  { id: "iku", namaSubKegiatan: "Sub kegiatan utama", indikator: [{ kategoriIndikator: "IKU" }] },
  { id: "none", namaSubKegiatan: "Sub kegiatan tanpa indikator", indikator: [] },
];

for (const kind of ["kinerja", "keuangan"]) {
  for (const mobile of [false, true]) {
    test(`${kind}: category choices, submission and ${mobile ? "mobile" : "desktop"} layout`, async ({ page }) => {
      const submissions: Record<string, unknown>[] = [];
      await page.setViewportSize(mobile ? { width: 390, height: 650 } : { width: 1440, height: 1000 });
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth/me") {
          return route.fulfill({ json: {
            id: "form-test", name: "Pengguna Uji", role: "ADMIN_DINKES",
            faskesId: null, bidangId: null, permissions: ["capaian_kinerja", "capaian_keuangan"],
          } });
        }
        if (url.pathname === "/api/options") {
          return route.fulfill({ json: { faskes: [{ id: "facility", namaFaskes: "Puskesmas Uji" }], bidang: [] } });
        }
        if (url.pathname === `/api/capaian/${kind}`) {
          if (route.request().method() === "PUT") {
            submissions.push(route.request().postDataJSON());
            return route.fulfill({ json: { id: "saved" } });
          }
          const available = kind === "keuangan" ? activities : indicators.filter((i) => !url.searchParams.get("kategori") || i.kategoriIndikator === url.searchParams.get("kategori"));
          return route.fulfill({ json: {
            data: [], available,
            months: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, open: i !== 1 })),
          } });
        }
        return route.fulfill({ status: 503, json: { message: "Di luar lingkup pengujian." } });
      });
      await page.goto(`/capaian/${kind}`);
      if (kind === "kinerja") {
        await page.getByLabel("Kategori indikator", { exact: true }).selectOption("SPM");
      }
      await page.getByRole("button", { name: "Input capaian", exact: true }).click();
      const dialog = page.getByRole("dialog");
      const category = dialog.getByLabel("Kategori indikator", { exact: true });
      const entity = dialog.locator("#entity");
      await dialog.getByLabel("Fasilitas kesehatan").selectOption("facility");
      await category.selectOption("SPM");
      await expect(entity.locator('option[value="spm"]')).toHaveCount(1);
      await expect(entity.locator('option[value="iku"]')).toHaveCount(0);
      await entity.selectOption("spm");
      await category.selectOption("IKU");
      await expect(entity).toHaveValue("");
      await expect(entity.locator('option[value="iku"]')).toHaveCount(1);
      await expect(entity.locator('option[value="spm"]')).toHaveCount(0);
      if (kind === "keuangan") {
        await category.selectOption("");
        await expect(entity.locator('option[value="none"]')).toHaveCount(1);
      }
      await category.selectOption("SPM");
      await entity.selectOption("spm");
      await dialog.getByLabel("Jenis pengisian").selectOption("monthly");
      await expect(dialog.locator('#month option[value="2"]')).toBeDisabled();
      await dialog.getByLabel("Bulan laporan").selectOption("3");
      await dialog.locator("#value").fill("125.5");
      await expect(dialog).toBeInViewport({ ratio: 1 });
      expect(await dialog.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return el.scrollWidth <= el.clientWidth && [...el.querySelectorAll("select, input")].every((field) => {
          const box = field.getBoundingClientRect();
          return box.left >= bounds.left && box.right <= bounds.right;
        });
      })).toBe(true);
      await page.screenshot({ path: `test-results/capaian-${kind}-${mobile ? "mobile" : "desktop"}.png` });
      await dialog.getByRole("button", { name: "Simpan capaian" }).click();
      await expect(dialog).toBeHidden();
      expect(submissions[0]).toEqual({ entityId: "spm", faskesId: "facility", tahun: new Date().getFullYear(), bulan: 3, nilai: 125.5 });

      await page.getByRole("button", { name: "Input capaian", exact: true }).click();
      await dialog.getByLabel("Fasilitas kesehatan").selectOption("facility");
      await category.selectOption("");
      await entity.selectOption(kind === "keuangan" ? "none" : "iku");
      await dialog.locator("#value").fill("500");
      await page.getByRole("button", { name: "Simpan capaian" }).click();
      await expect(dialog).toBeHidden();
      expect(submissions[1]).toEqual({ entityId: kind === "keuangan" ? "none" : "iku", faskesId: "facility", tahun: new Date().getFullYear(), target: 500 });
    });
  }
}

test("kinerja: menampilkan alert jika indikator sudah pernah diinput", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/me") {
      return route.fulfill({
        json: {
          id: "form-test",
          name: "Pengguna Uji",
          role: "ADMIN_DINKES",
          faskesId: null,
          bidangId: null,
          permissions: ["capaian_kinerja"],
        },
      });
    }
    if (url.pathname === "/api/options") {
      return route.fulfill({
        json: {
          faskes: [{ id: "facility", namaFaskes: "Puskesmas Uji" }],
          bidang: [],
        },
      });
    }
    if (url.pathname === "/api/capaian/kinerja") {
      if (route.request().method() === "PUT") {
        return route.fulfill({ json: { id: "saved" } });
      }
      return route.fulfill({
        json: {
          data: [
            {
              id: "existing-1",
              indikatorId: "spm",
              faskesId: "facility",
              tahun: new Date().getFullYear(),
              target: 100,
              realisasi: 45,
              persentase: 45,
              status: "KUNING",
              label: "Pelayanan Kesehatan SPM Uji",
              faskes: { namaFaskes: "Puskesmas Uji" },
              indikator: {
                subKegiatan: {
                  namaSubKegiatan: "Sub Kegiatan Uji",
                },
              },
            },
          ],
          available: [
            { id: "spm", namaIndikator: "Pelayanan Kesehatan SPM Uji", kategoriIndikator: "SPM" },
            { id: "iku", namaIndikator: "Indikator Baru", kategoriIndikator: "IKU" },
          ],
          months: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, open: true })),
        },
      });
    }
    return route.fulfill({ status: 503, json: { message: "Di luar lingkup pengujian." } });
  });

  await page.goto("/capaian/kinerja");
  await expect(page.getByRole("heading", { name: "Capaian kinerja" })).toBeVisible();
  const inputBtn = page.getByRole("button", { name: "Input capaian", exact: true });
  await expect(inputBtn).toBeVisible();
  await inputBtn.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fasilitas kesehatan").selectOption("facility");

  // Periksa bahwa option indikator yang sudah ada memiliki penanda
  const entity = dialog.locator("#entity");
  await expect(entity.locator('option[value="spm"]')).toContainText("(Sudah ada di daftar)");

  // Pilih indikator yang sudah ada
  await entity.selectOption("spm");

  // Periksa alert banner muncul di modal
  const alert = dialog.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Indikator Sudah Pernah Diinput");
  await expect(alert).toContainText("Target Saat Ini: 100");

  // Periksa toggle filter "Hanya belum diinput"
  const toggleBtn = dialog.getByRole("button", { name: /Hanya belum diinput/ });
  await expect(toggleBtn).toBeVisible();
  await toggleBtn.click();
  await expect(dialog.getByRole("button", { name: /Tampilkan semua/ })).toBeVisible();
  await dialog.getByRole("button", { name: /Tampilkan semua/ }).click();

  // Klik simpan untuk memicu dialog konfirmasi shadcn internal
  await dialog.getByRole("button", { name: "Simpan capaian" }).click();
  const confirmDialog = page.getByRole("dialog").filter({ hasText: "Konfirmasi Pembaruan Data Capaian" });
  await expect(confirmDialog).toBeVisible();
  await expect(confirmDialog).toContainText("Pelayanan Kesehatan SPM Uji");
  await confirmDialog.getByRole("button", { name: "Ya, Perbarui Data" }).click();
  await expect(confirmDialog).toBeHidden();
  await expect(dialog).toBeHidden();
});

