import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sessionFile = process.env.GASS_BROWSER_SESSIONS;
const sessions = sessionFile
  ? JSON.parse(readFileSync(sessionFile, "utf8"))
  : null;
test("login renders on desktop and mobile with accessible fields", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Selamat Datang" }),
  ).toBeVisible();
  await expect(page.getByLabel("Username atau NIP")).toBeVisible();
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("Username atau NIP wajib diisi.")).toBeVisible();
  await expect(page.getByText("Password wajib diisi.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
test.describe("Authenticated GASS workflows", () => {
  test.skip(
    !sessions,
    "Prepare isolated browser sessions to test authenticated flows.",
  );
  test("admin dashboard, master CRUD, settings, matrix, and mobile sidebar", async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.addCookies([sessions.admin.cookie]);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Ringkasan kinerja kesehatan." }),
    ).toBeVisible();
    await page
      .getByLabel("Tahun anggaran")
      .selectOption(String(new Date().getFullYear() - 1));
    await expect(
      page.getByRole("heading", { name: "Capaian indikator SPM" }),
    ).toBeVisible();
    await expect(
      page.getByText("SPM Uji", { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/dashboard-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/master/satuan");
    await page.getByRole("button", { name: "Tambah data" }).click();
    const name = `Satuan browser ${Date.now()}`;
    await page.getByLabel("Nama satuan").fill(name);
    await page.getByLabel("Simbol / singkatan").fill("br");
    await page.getByRole("button", { name: "Simpan data" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.getByLabel("Cari data").fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: `Edit ${name}`, exact: true })
      .click();
    await page.getByLabel("Simbol / singkatan").fill("upd");
    await page.getByRole("button", { name: "Simpan data" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("upd", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: `Hapus ${name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Hapus data", exact: true }).click();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
    await page.goto("/pengaturan/jadwal");
    await expect(
      page.getByRole("heading", { name: "Aturan periode input" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(page.getByText("Pengaturan disimpan.")).toBeVisible();
    await page.goto("/pengaturan/otoritas");
    await expect(
      page.getByRole("checkbox", {
        name: "Operator Puskesmas master_program",
        exact: true,
      }),
    ).toBeDisabled();
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("button", { name: "Toggle Sidebar" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    await expect(
      page.getByRole("link", { name: "Capaian kinerja", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/dashboard-mobile-menu.png",
      fullPage: false,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("link", { name: "Capaian kinerja", exact: true }),
    ).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Beralih ke mode gelap" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(errors).toEqual([]);
  });
  test("operator sees only assigned facility and no master navigation", async ({
    page,
    context,
  }) => {
    await context.addCookies([sessions.operator.cookie]);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Ringkasan kinerja kesehatan." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Program", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Fasilitas kesehatan")).toBeDisabled();
    await expect(page.getByLabel("Fasilitas kesehatan")).toHaveValue(
      sessions.operator.faskesId,
    );
    await page.goto("/master/program");
    await expect(
      page.getByRole("heading", { name: "Akses terbatas" }),
    ).toBeVisible();
    await page.goto("/capaian/kinerja");
    await page
      .getByLabel("Tahun anggaran")
      .selectOption(String(new Date().getFullYear() - 1));
    await expect(page.getByText("SPM Uji", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Edit Januari SPM Uji", exact: true })
      .click();
    await page.getByLabel("Realisasi bulan ini").fill("45");
    await page
      .getByRole("button", { name: "Simpan capaian", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Januari SPM Uji", exact: true }),
    ).toHaveText("45");
    await expect(
      page.getByRole("button", { name: "Edit Februari SPM Uji", exact: true }),
    ).toBeDisabled();
  });
});
