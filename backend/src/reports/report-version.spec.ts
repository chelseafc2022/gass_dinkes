import { ConflictException } from "@nestjs/common";
import { assertReportVersion } from "./report-version";
describe("mobile report concurrency precondition", () => {
  const current = new Date("2026-10-20T00:00:00.000Z");
  it("preserves existing clients that omit the precondition", () => {
    expect(() => assertReportVersion(undefined, current)).not.toThrow();
  });
  it("allows creation only when no report exists", () => {
    expect(() => assertReportVersion(null, undefined)).not.toThrow();
    expect(() => assertReportVersion(null, current)).toThrow(ConflictException);
  });
  it("accepts the loaded version and rejects changed or deleted reports", () => {
    expect(() =>
      assertReportVersion(current.toISOString(), current),
    ).not.toThrow();
    expect(() =>
      assertReportVersion("2026-10-19T00:00:00.000Z", current),
    ).toThrow(ConflictException);
    expect(() => assertReportVersion(current.toISOString(), undefined)).toThrow(
      ConflictException,
    );
  });
});
