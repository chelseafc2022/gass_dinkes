import {
  facilityScope,
  hardPermission,
  periodOpen,
  percentage,
  status,
  Actor,
} from "./policy";
const settings = { batasTanggalInput: 5, isOtomatisAktif: true };
const u = { role: "OPERATOR_PUSKESMAS", faskesId: "a" } as Actor;
describe("Period policy — Asia/Makassar", () => {
  test("deadline is inclusive at 23:59:59.999 WITA", () =>
    expect(
      periodOpen(2026, 8, settings, null, new Date("2026-09-05T15:59:59.999Z")),
    ).toBe(true));
  test("locks at midnight WITA", () =>
    expect(
      periodOpen(2026, 8, settings, null, new Date("2026-09-05T16:00:00Z")),
    ).toBe(false));
  test("December rolls into next year", () =>
    expect(
      periodOpen(2026, 12, settings, null, new Date("2027-01-05T16:00:00Z")),
    ).toBe(false));
  test("historical backfill ignores calendar deadlines", () =>
    expect(periodOpen(2020, 1, { ...settings, isOtomatisAktif: false })).toBe(
      true,
    ));
  test("manual close wins over backfill", () =>
    expect(
      periodOpen(
        2020,
        1,
        { ...settings, isOtomatisAktif: false },
        { statusOverride: "TUTUP" },
      ),
    ).toBe(false));
  test("manual open can reopen expired report", () =>
    expect(periodOpen(2020, 1, settings, { statusOverride: "BUKA" })).toBe(
      true,
    ));
  test("special deadline expires", () =>
    expect(
      periodOpen(2020, 1, settings, {
        statusOverride: "BUKA",
        batasKhusus: new Date("2020-03-01"),
      }),
    ).toBe(false));
  test("period before automatic activation remains open", () =>
    expect(
      periodOpen(
        2026,
        8,
        { ...settings, mulaiOtomatisPeriode: "2026-12" },
        null,
        new Date("2027-01-01"),
      ),
    ).toBe(true));
  test.each([0, 13, 1.5])("reject invalid month %s", (m) =>
    expect(() => periodOpen(2026, m, settings)).toThrow(),
  );
});
describe("Data scope and scoring", () => {
  test("operator scope cannot be overridden", () =>
    expect(() => facilityScope(u, "b")).toThrow());
  test("operator defaults to own facility", () =>
    expect(facilityScope(u)).toBe("a"));
  test("unassigned operator fails closed", () =>
    expect(() => facilityScope({ ...u, faskesId: null })).toThrow());
  test("admin dinkes always has full permission", () =>
    expect(hardPermission("ADMIN_DINKES", "pengguna")).toBe(true));
  test("roles can be configured dynamically by matrix", () =>
    expect(hardPermission(u.role, "master_program")).toBe(true));
  test("zero target never produces infinity", () =>
    expect(percentage(100, 0)).toBe(0));
  test("uses absolute threshold when configured", () =>
    expect(
      status(90, 1000, {
        jenisThreshold: "NILAI_ABSOLUT",
        thresholdHijauMin: 80,
        thresholdKuningMin: 50,
      }),
    ).toBe("HIJAU"));
  test.each([
    [49.99, "MERAH"],
    [50, "KUNING"],
    [79.99, "KUNING"],
    [80, "HIJAU"],
  ])("classifies boundary %s", (value, color) =>
    expect(status(Number(value), 100)).toBe(color),
  );
});
