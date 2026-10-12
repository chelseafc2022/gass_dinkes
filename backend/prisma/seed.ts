import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { MENUS, ROLES, defaultPermission } from "../src/common/policy";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  await db.pengaturanSistem.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });
  for (const role of ROLES)
    for (const menuKey of MENUS)
      await db.menuPermission.upsert({
        where: { role_menuKey: { role, menuKey } },
        create: { role, menuKey, canAccess: defaultPermission(role, menuKey) },
        update: {},
      });
  for (const [namaSatuan, simbol] of [
    ["Persen", "%"],
    ["Orang", "org"],
    ["Kasus", "kasus"],
    ["Dokumen", "dok"],
    ["Balita", "balita"],
    ["Ibu Hamil", "ibu"],
    ["Desa", "desa"],
  ])
    await db.satuan.upsert({
      where: { namaSatuan },
      create: { namaSatuan, simbol },
      update: {},
    });
  if (process.env.BOOTSTRAP_ADMIN_NIP)
    await db.user.upsert({
      where: { nip: process.env.BOOTSTRAP_ADMIN_NIP },
      create: {
        nip: process.env.BOOTSTRAP_ADMIN_NIP,
        name: process.env.BOOTSTRAP_ADMIN_NAME || "Administrator Dinkes",
        role: "ADMIN_DINKES",
      },
      update: {},
    });
  console.log(
    "Seed GASS selesai. Program, indikator, dan capaian diisi dari data resmi Dinas Kesehatan.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
