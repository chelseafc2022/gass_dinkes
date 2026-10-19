import { ThresholdService, thresholdSchema } from "./threshold.service";
import { Actor } from "../common/policy";

const rules = [1, 2, 3, 4].map((triwulan) => ({
  triwulan,
  hijauMin: 100,
  kuningMin: triwulan === 4 ? null : triwulan * 25,
}));

describe("Master threshold", () => {
  test("accepts four complete rules including disabled yellow", () => {
    expect(thresholdSchema.parse({ rules })).toEqual({ rules });
  });
  test.each([
    rules.slice(0, 3),
    [rules[0], rules[0], rules[2], rules[3]],
    [{ ...rules[0], hijauMin: 0 }, ...rules.slice(1)],
    [{ ...rules[0], hijauMin: 101 }, ...rules.slice(1)],
    [{ ...rules[0], kuningMin: 100 }, ...rules.slice(1)],
    [{ ...rules[0], kuningMin: -1 }, ...rules.slice(1)],
    [{ ...rules[0], hijauMin: NaN }, ...rules.slice(1)],
  ])("rejects incomplete, duplicate or invalid rules %#", (...values) => {
    expect(thresholdSchema.safeParse({ rules: values }).success).toBe(false);
  });
  test.each(["AKUN_BIDANG", "OPERATOR_PUSKESMAS", "KEPALA_DINAS"])(
    "rejects %s before touching storage",
    async (role) => {
      const service = new ThresholdService({} as never);
      await expect(service.list({ role } as Actor)).rejects.toThrow(
        "Admin Dinkes",
      );
      await expect(service.save({ role } as Actor, { rules })).rejects.toThrow(
        "Admin Dinkes",
      );
    },
  );
  test("saves all quarters and audit in one transaction", async () => {
    const tx = {
      thresholdTriwulan: {
        findMany: jest.fn().mockResolvedValue(rules),
        upsert: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const db = { $transaction: jest.fn((fn) => fn(tx)) };
    const service = new ThresholdService(db as never);
    await expect(
      service.save({ id: "admin", role: "ADMIN_DINKES" } as Actor, { rules }),
    ).resolves.toEqual({ rules });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.thresholdTriwulan.upsert).toHaveBeenCalledTimes(4);
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin",
          entity: "threshold_triwulan",
        }),
      }),
    );
  });
});
