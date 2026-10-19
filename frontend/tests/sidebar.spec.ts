import { expect, test } from "@playwright/test";

// Isolate shell navigation from live authentication and operational data.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/auth/me") {
      return route.fulfill({
        json: {
          id: "sidebar-ui-test",
          name: "Pengguna Uji",
          nip: "TEST",
          role: "ADMIN_DINKES",
          faskesId: null,
          bidangId: null,
          permissions: ["dashboard", "capaian_kinerja", "capaian_keuangan", "master_satuan"],
        },
      });
    }
    return route.fulfill({ status: 503, json: { message: "Data tidak tersedia dalam uji navigasi." } });
  });
});

test("collapsed sidebar keeps its logo and navigation icons centered", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: "Buka atau tutup sidebar", exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  const rail = page.locator('[data-slot="sidebar-inner"]');
  await expect.poll(async () => {
    const box = await rail.boundingBox();
    const logo = await rail.locator(".gass-sidebar-logo-wrap").boundingBox();
    const icons = await rail.locator('[data-sidebar="menu-button"] > svg').all();
    if (!box || !logo || !icons.length) return false;
    const center = box.x + box.width / 2;
    if (logo.x - box.x < 8 || Math.abs(logo.x + logo.width / 2 - center) > 1) return false;
    for (const icon of icons) {
      const bounds = await icon.boundingBox();
      if (!bounds || Math.abs(bounds.x + bounds.width / 2 - center) > 1) return false;
    }
    return true;
  }).toBe(true);
  await page.screenshot({ path: "test-results/sidebar-collapsed.png" });
});

test("mobile sidebar opens inside viewport, closes, and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 427, height: 952 });
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: "Buka atau tutup navigasi", exact: true });
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await trigger.click();
  await expect(drawer).toHaveCSS("position", "fixed");
  await expect(drawer).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "test-results/sidebar-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await trigger.click();
  await drawer.getByRole("link", { name: "Capaian kinerja", exact: true }).click();
  await expect(page).toHaveURL(/\/capaian\/kinerja$/);
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(drawer).toBeInViewport({ ratio: 1 });
  await page.mouse.click(410, 100);
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeEnabled();
});
