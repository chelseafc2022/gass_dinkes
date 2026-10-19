import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { z } from "zod";
import { Actor } from "../common/policy";
import { PrismaService } from "../prisma/prisma.service";

const ruleSchema = z
  .object({
    triwulan: z.number().int().min(1).max(4),
    hijauMin: z.number().finite().positive().max(100),
    kuningMin: z.number().finite().min(0).max(100).nullable(),
  })
  .strict()
  .refine((r) => r.kuningMin === null || r.kuningMin < r.hijauMin, {
    message: "Batas kuning harus lebih kecil dari batas hijau.",
    path: ["kuningMin"],
  });
export const thresholdSchema = z
  .object({
    rules: z
      .array(ruleSchema)
      .length(4)
      .refine(
        (rules) => new Set(rules.map((r) => r.triwulan)).size === 4,
        "Aturan harus mencakup Triwulan I, II, III, dan IV masing-masing sekali.",
      ),
  })
  .strict();

@Injectable()
export class ThresholdService {
  constructor(private db: PrismaService) {}

  async rules() {
    const rules = await this.db.thresholdTriwulan.findMany({
      orderBy: { triwulan: "asc" },
    });
    if (rules.length !== 4) {
      throw new ServiceUnavailableException(
        "Master threshold triwulan belum lengkap. Hubungi Admin Dinkes.",
      );
    }
    return rules;
  }

  private assertAdmin(u: Actor) {
    if (u.role !== "ADMIN_DINKES") {
      throw new ForbiddenException(
        "Master threshold hanya dapat dikelola Admin Dinkes.",
      );
    }
  }

  async list(u: Actor) {
    this.assertAdmin(u);
    return { rules: await this.rules() };
  }

  async save(u: Actor, body: unknown) {
    this.assertAdmin(u);
    const { rules } = thresholdSchema.parse(body);
    return this.db.$transaction(async (tx) => {
      const before = await tx.thresholdTriwulan.findMany({
        orderBy: { triwulan: "asc" },
      });
      for (const rule of rules) {
        await tx.thresholdTriwulan.upsert({
          where: { triwulan: rule.triwulan },
          create: rule,
          update: rule,
        });
      }
      await tx.auditLog.create({
        data: {
          userId: u.id,
          action: "UPDATE",
          entity: "threshold_triwulan",
          entityId: "global",
          details: JSON.stringify({ before, after: rules }),
        },
      });
      return {
        rules: await tx.thresholdTriwulan.findMany({
          orderBy: { triwulan: "asc" },
        }),
      };
    });
  }
}
