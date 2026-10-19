import { ReportsService } from "./reports.service";
import { Actor, MONTHS } from "../common/policy";
import { ThresholdService } from "../master/threshold.service";

describe("Global threshold across reports and dashboard", () => {
  const actor = { role: "ADMIN_DINKES" } as Actor;
  const rules = [1, 2, 3, 4].map((triwulan) => ({
    triwulan,
    hijauMin: 100,
    kuningMin: triwulan === 4 ? null : triwulan * 25,
  }));
  const indicator = {
    id: "indicator",
    namaIndikator: "Indikator Uji",
    kategoriIndikator: "SPM",
    satuan: { namaSatuan: "Persen" },
    subKegiatan: {},
    jenisThreshold: "NILAI_ABSOLUT",
    thresholdHijauMin: 1,
    thresholdKuningMin: 0,
  };
  const row = {
    id: "report",
    indikatorId: indicator.id,
    faskesId: "facility",
    targetKinerja: 100,
    indikator: indicator,
    faskes: { namaFaskes: "Puskesmas Uji" },
    verifikasiBulanan: [
      { bulan: 1, isValidated: true },
      { bulan: 4, isValidated: true },
      { bulan: 7, isValidated: false },
      { bulan: 10, isValidated: false },
    ],
    ...Object.fromEntries(
      MONTHS.map((month, i) => [month, i % 3 === 0 ? 25 : 0]),
    ),
  };
  let service: ReportsService;
  beforeEach(() => {
    const db = {
      capaianKinerja: { findMany: jest.fn().mockResolvedValue([row]) },
      capaianKeuangan: { findMany: jest.fn().mockResolvedValue([]) },
      indikator: { findMany: jest.fn().mockResolvedValue([indicator]) },
      subKegiatan: { findMany: jest.fn().mockResolvedValue([]) },
      pengaturanSistem: {
        findUnique: jest.fn().mockResolvedValue({ isOtomatisAktif: false }),
      },
      periodeOverride: { findMany: jest.fn().mockResolvedValue([]) },
      faskes: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: "facility", namaFaskes: "Puskesmas Uji" }]),
      },
    };
    service = new ReportsService(
      db as never,
      { rules: async () => rules } as ThresholdService,
    );
  });
  test.each([
    { triwulan: 1, expectedRealisasi: 25, expectedStatus: "KUNING" },
    { triwulan: 2, expectedRealisasi: 50, expectedStatus: "KUNING" },
    { triwulan: 3, expectedRealisasi: 50, expectedStatus: "MERAH" },
    { triwulan: 4, expectedRealisasi: 50, expectedStatus: "MERAH" },
  ])(
    "TW $triwulan uses Jan-to-quarter verified cumulative values (realisasi: $expectedRealisasi)",
    async ({ triwulan, expectedRealisasi, expectedStatus }) => {
      const reports = await service.list("kinerja", actor, {
        tahun: 2026,
        triwulan,
      });
      expect(reports.data[0].realisasi).toBe(expectedRealisasi);
      expect(reports.data[0].status).toBe(expectedStatus);
      expect(reports.threshold?.triwulan).toBe(triwulan);
      const dashboard = await service.dashboard(actor, {
        tahun: 2026,
        triwulan,
      });
      expect(dashboard.indicators[0].realisasi).toBe(expectedRealisasi);
      expect(dashboard.indicators[0].status).toBe(reports.data[0].status);
      expect(dashboard.summary.jumlahLaporan).toBe(triwulan);
      expect(dashboard.summary.tervalidasi).toBe(Math.min(2, triwulan));
      expect(dashboard.indicators[0].ranking[0].status).toBe(
        reports.data[0].status,
      );
      expect(dashboard.indicators[0].trend.map((t) => t.value)).toEqual([
        25, 50, 50, 50,
      ]);
    },
  );
  test("annual view uses IV and monthly view accumulates through verified selected month", async () => {
    const annual = await service.list("kinerja", actor, { tahun: 2026 });
    expect(annual.threshold?.triwulan).toBe(4);
    expect(annual.data[0].realisasi).toBe(50);
    expect(annual.data[0].realisasiGross).toBe(100);
    const monthly = await service.list("kinerja", actor, {
      tahun: 2026,
      bulan: 5,
    });
    expect(monthly.threshold?.triwulan).toBe(2);
    expect(monthly.cumulativeThrough).toBe(5);
    expect(monthly.data[0].realisasi).toBe(50);
  });
});
