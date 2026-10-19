import { expect, test, Page } from "@playwright/test";

async function mockReports(page: Page, role: string, kind: string) {
  const requests: { path: string; body: any }[] = [];
  const monthKeys = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const row = {
    id: "report",
    indikatorId: "indicator",
    subKegiatanId: "sub",
    faskesId: "facility",
    label: "Indikator Uji",
    target: 100,
    realisasi: 40,
    persentase: 40,
    status: "KUNING",
    faskes: { namaFaskes: "Puskesmas Uji" },
    indikator: { subKegiatan: { namaSubKegiatan: "Sub kegiatan Uji" } },
    subKegiatan: { kegiatan: { namaKegiatan: "Kegiatan Uji" } },
    canVerify: ["ADMIN_DINKES", "AKUN_BIDANG"].includes(role),
    ...Object.fromEntries(
      monthKeys.map((m, i) => [`capaian${m}`, i === 0 ? 40 : 0]),
    ),
    verifikasiBulanan: [
      {
        bulan: 1,
        isValidated: true,
        verifiedBy: { name: "Admin Uji" },
        verifiedAt: "2026-01-31T08:00:00Z",
      },
      { bulan: 2, isValidated: false, verifiedBy: null, verifiedAt: null },
    ],
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me")
      return route.fulfill({
        json: {
          id: "user",
          name: "Pengguna Uji",
          role,
          faskesId: role === "OPERATOR_PUSKESMAS" ? "facility" : null,
          bidangId: role === "AKUN_BIDANG" ? "bidang" : null,
          permissions: ["capaian_kinerja", "capaian_keuangan"],
        },
      });
    if (path === "/api/options")
      return route.fulfill({
        json: {
          faskes: [{ id: "facility", namaFaskes: "Puskesmas Uji" }],
          bidang: [],
        },
      });
    if (path.startsWith(`/api/capaian/${kind}`)) {
      if (route.request().method() !== "GET") {
        const body = route.request().postDataJSON();
        requests.push({ path, body });
        if (path.endsWith("/verify")) {
          const monthly = row.verifikasiBulanan.find(
            (m) => m.bulan === body.bulan,
          )!;
          monthly.isValidated = body.validated;
          monthly.verifiedBy = body.validated ? { name: "Admin Uji" } : null;
        } else if (body.bulan) {
          const existing = row.verifikasiBulanan.find(
            (m) => m.bulan === body.bulan,
          );
          if (!existing)
            row.verifikasiBulanan.push({
              bulan: body.bulan,
              isValidated: false,
              verifiedBy: null,
              verifiedAt: null,
            });
        }
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({
        json: {
          data: [
            {
              ...row,
              submittedMonths: row.verifikasiBulanan.length,
              verifiedMonths: row.verifikasiBulanan.filter((m) => m.isValidated)
                .length,
            },
          ],
          available: [
            {
              id: kind === "kinerja" ? "indicator" : "sub",
              namaIndikator: "Indikator Uji",
              namaSubKegiatan: "Sub kegiatan Uji",
              kategoriIndikator: "SPM",
            },
          ],
          months: monthKeys.map(() => ({ open: true })),
        },
      });
    }
    return route.fulfill({
      status: 503,
      json: { message: "Di luar lingkup uji." },
    });
  });
  return requests;
}

for (const kind of ["kinerja", "keuangan"]) {
  test(`${kind}: reviewer verifies one month and can reopen it via verification panel`, async ({
    page,
  }) => {
    const requests = await mockReports(page, "AKUN_BIDANG", kind);
    await page.goto(`/capaian/${kind}`);
    await expect(page.getByText("1/2 bulan", { exact: true })).toBeVisible();

    // Verifikasi bahwa tombol verifikasi di dalam sel tabel sudah ditiadakan (tabel bersih dan rapi)
    await expect(
      page.getByRole("button", { name: /^Verifikasi / }),
    ).toHaveCount(0);

    // Buka Panel Verif
    await page.getByRole("button", { name: /^Detail dan verifikasi/ }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible();

    // Verifikasi Februari di dalam panel
    const febRow = sheet.getByTestId("sheet-month-2");
    await febRow.getByRole("button", { name: /Verifikasi/ }).click();
    await expect(page.getByText("2/2 bulan", { exact: true })).toBeVisible();
    expect(requests[0]).toEqual({
      path: `/api/capaian/${kind}/report/verify`,
      body: { bulan: 2, validated: true, nilai: 0, target: 100 },
    });

    // Batalkan verifikasi Januari di dalam panel
    const janRow = sheet.getByTestId("sheet-month-1");
    await janRow.getByRole("button", { name: /Batalkan/ }).click();
    await expect(janRow.getByRole("button", { name: /Verifikasi/ })).toBeVisible();
    await expect(febRow.getByRole("button", { name: /Batalkan/ })).toBeVisible();
    expect(requests[1].body.bulan).toBe(1);
    expect(requests[1].body.validated).toBe(false);
    await page.screenshot({
      path: `test-results/monthly-verification-${kind}.png`,
      fullPage: true,
    });
  });
}

test("faskes can submit zero in an empty month while a different month stays locked", async ({
  page,
}) => {
  const requests = await mockReports(page, "OPERATOR_PUSKESMAS", "kinerja");
  await page.goto("/capaian/kinerja");
  await expect(page.getByRole("button", { name: /^Verifikasi / })).toHaveCount(
    0,
  );
  // Pastikan kolom verifikasi, tombol Panel Verif, dan trigger sheet tidak ditampilkan untuk operator faskes
  await expect(
    page.getByRole("columnheader", { name: /Verifikasi/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Panel Verif/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /^Detail dan verifikasi/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Indikator Uji" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Indikator Uji", { exact: true })).toBeVisible();

  await expect(page.getByLabel("Realisasi Januari Indikator Uji")).toHaveCount(
    0,
  );
  await expect(
    page.getByLabel("Realisasi Februari Indikator Uji"),
  ).toBeEnabled();
  const march = page.getByLabel("Realisasi Maret Indikator Uji");
  await expect(march).toHaveValue("");
  await march.fill("0");
  await march.press("Enter");
  await expect(march).toHaveValue("0");
  expect(requests[0].body).toEqual({
    entityId: "indicator",
    faskesId: "facility",
    tahun: new Date().getFullYear(),
    bulan: 3,
    nilai: 0,
  });
  await page
    .getByRole("button", { name: "Input capaian", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#entity").selectOption("indicator");
  await dialog.getByLabel("Jenis pengisian").selectOption("monthly");
  await expect(dialog.locator('#month option[value="1"]')).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Simpan capaian" }),
  ).toBeDisabled();
  await dialog.getByLabel("Bulan laporan").selectOption("4");
  await expect(
    dialog.getByRole("button", { name: "Simpan capaian" }),
  ).toBeEnabled();
});

test("reviewer can verify and cancel directly inside the verification sheet panel", async ({
  page,
}) => {
  const requests = await mockReports(page, "ADMIN_DINKES", "kinerja");
  await page.goto("/capaian/kinerja");

  // Buka Sheet melalui tombol "Panel Verif"
  const panelBtn = page.getByRole("button", { name: /^Detail dan verifikasi/ });
  await expect(panelBtn).toBeVisible();
  await panelBtn.click();

  // Pastikan Sheet terbuka dengan detail KPI
  const sheet = page.locator('[data-slot="sheet-content"]');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("PANEL VERIFIKASI & DETAIL")).toBeVisible();
  await expect(sheet.getByText("Indikator Uji")).toBeVisible();
  await expect(sheet.getByText("Target Tahunan")).toBeVisible();

  // Verifikasi bulan Februari langsung dari dalam sheet
  const febRow = sheet.getByTestId("sheet-month-2");
  const verifFebBtn = febRow.getByRole("button", { name: /Verifikasi/ });
  await expect(verifFebBtn).toBeVisible();
  await verifFebBtn.click();

  expect(requests[0]).toEqual({
    path: "/api/capaian/kinerja/report/verify",
    body: { bulan: 2, validated: true, nilai: 0, target: 100 },
  });

  // Batalkan verifikasi Januari langsung dari dalam sheet
  const janRow = sheet.getByTestId("sheet-month-1");
  const cancelJanBtn = janRow.getByRole("button", { name: /Batalkan/ });
  await expect(cancelJanBtn).toBeVisible();
  await cancelJanBtn.click();

  expect(requests[1].body.bulan).toBe(1);
  expect(requests[1].body.validated).toBe(false);

  // Tutup sheet
  await sheet.getByRole("button", { name: "Tutup" }).click();
  await expect(sheet).toBeHidden();
});

