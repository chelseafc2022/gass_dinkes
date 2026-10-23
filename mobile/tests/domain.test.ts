import test from "node:test";
import assert from "node:assert/strict";
import {
  decimal,
  reportInput,
  canWrite,
  canVerify,
  userSchema,
} from "../src/core/domain.ts";
test("accept explicit zero and Indonesian decimals, reject ambiguous or invalid amounts", () => {
  assert.equal(decimal("0"), 0);
  assert.equal(decimal("123,45"), 123.45);
  for (const value of [
    "",
    "-1",
    "1.000.000",
    "1e9",
    "Infinity",
    "1,234",
    "NaN",
  ])
    assert.throws(() => decimal(value));
});
test("monthly payload requires a conflict baseline and valid calendar period", () => {
  const valid = {
    entityId: "indicator",
    faskesId: "facility",
    tahun: 2026,
    bulan: 10,
    nilai: 0,
    expectedUpdatedAt: null,
  };
  assert.equal(reportInput.parse(valid).nilai, 0);
  assert.equal(reportInput.safeParse({ ...valid, bulan: 13 }).success, false);
  assert.equal(
    reportInput.safeParse({ ...valid, expectedUpdatedAt: undefined }).success,
    false,
  );
  assert.equal(reportInput.safeParse({ ...valid, nilai: -1 }).success, false);
});
test("leadership is read only and only reviewers can verify", () => {
  const user = userSchema.parse({
    id: "1",
    name: "Test",
    role: "KEPALA_DINAS",
    permissions: ["dashboard"],
    faskesId: null,
    bidangId: null,
  });
  assert.equal(canWrite(user), false);
  assert.equal(canVerify(user), false);
  assert.equal(canVerify({ ...user, role: "OPERATOR_PUSKESMAS" }), false);
  assert.equal(canVerify({ ...user, role: "AKUN_BIDANG" }), true);
});
