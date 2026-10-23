import { ConflictException } from "@nestjs/common";

/** Optional for existing web clients; mobile always sends a baseline, null for creation. */
export function assertReportVersion(
  expected: string | null | undefined,
  current: Date | undefined,
) {
  if (expected === undefined) return;
  if (expected !== (current?.toISOString() ?? null)) {
    throw new ConflictException(
      "Laporan berubah sejak dibuka. Muat ulang sebelum menyimpan.",
    );
  }
}
