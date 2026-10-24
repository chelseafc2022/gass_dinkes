import test from "node:test";
import assert from "node:assert/strict";
import {
  initialContext,
  responseSchema,
  contextLabel,
} from "../src/features/ai/contract.ts";

test("chat inherits selected dashboard period and rejects invalid years", () => {
  const context = initialContext(2026, 9, 3);
  assert.deepEqual(context.period, { tahun: 2026, bulan: null, triwulan: 3 });
  assert.match(contextLabel(context), /2026 · TW 3/);
  assert.throws(() => initialContext(9999, 1, null));
});
test("disabled AI has explicit state, not a fabricated answer", () => {
  assert.equal(
    responseSchema.parse({ enabled: false, message: "Belum aktif" }).enabled,
    false,
  );
  assert.equal(
    responseSchema.safeParse({ enabled: true, answer: "90%" }).success,
    false,
  );
});
test("validated answer preserves source filters and zero target", () => {
  const context = initialContext(2026, 10, null);
  const answer = responseSchema.parse({
    enabled: true,
    requestId: "req",
    answer: "Target belum tersedia",
    warnings: [],
    retrievedAt: "2026-10-24T00:00:00Z",
    resolvedContext: context,
    facts: [
      {
        id: "i",
        label: "Layanan A",
        unit: "orang",
        target: 0,
        realization: 0,
        percentage: null,
        gap: 0,
        status: "TARGET BELUM TERSEDIA",
        submitted: 0,
        verified: 0,
        expected: 10,
        period: "Januari–Oktober",
      },
    ],
    source: { label: "GASS", plan: context },
  });
  assert.ok(answer.enabled);
  assert.equal(answer.facts[0].percentage, null);
  assert.deepEqual(answer.source?.plan, context);
});
