CREATE TABLE "VerifikasiKinerjaBulanan" (
  "capaianId" TEXT NOT NULL,
  "bulan" INTEGER NOT NULL CHECK ("bulan" BETWEEN 1 AND 12),
  "submittedAt" TIMESTAMP(3),
  "isValidated" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "legacyVerification" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("capaianId", "bulan"),
  FOREIGN KEY ("capaianId") REFERENCES "CapaianKinerja"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "VerifikasiKeuanganBulanan" (
  "capaianId" TEXT NOT NULL,
  "bulan" INTEGER NOT NULL CHECK ("bulan" BETWEEN 1 AND 12),
  "submittedAt" TIMESTAMP(3),
  "isValidated" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "legacyVerification" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("capaianId", "bulan"),
  FOREIGN KEY ("capaianId") REFERENCES "CapaianKeuangan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Nonzero legacy values are known submissions. Keep annual approvals only for
-- these months, without inventing a verifier or a monthly verification date.
INSERT INTO "VerifikasiKinerjaBulanan" ("capaianId", "bulan", "isValidated", "legacyVerification")
SELECT c."id", m.bulan, c."isValidated", c."isValidated"
FROM "CapaianKinerja" c
CROSS JOIN LATERAL (VALUES
  (1, c."capaianJan"), (2, c."capaianFeb"), (3, c."capaianMar"),
  (4, c."capaianApr"), (5, c."capaianMei"), (6, c."capaianJun"),
  (7, c."capaianJul"), (8, c."capaianAgs"), (9, c."capaianSep"),
  (10, c."capaianOkt"), (11, c."capaianNov"), (12, c."capaianDes")
) AS m(bulan, nilai)
WHERE m.nilai <> 0;

INSERT INTO "VerifikasiKeuanganBulanan" ("capaianId", "bulan", "isValidated", "legacyVerification")
SELECT c."id", m.bulan, c."isValidated", c."isValidated"
FROM "CapaianKeuangan" c
CROSS JOIN LATERAL (VALUES
  (1, c."capaianJan"), (2, c."capaianFeb"), (3, c."capaianMar"),
  (4, c."capaianApr"), (5, c."capaianMei"), (6, c."capaianJun"),
  (7, c."capaianJul"), (8, c."capaianAgs"), (9, c."capaianSep"),
  (10, c."capaianOkt"), (11, c."capaianNov"), (12, c."capaianDes")
) AS m(bulan, nilai)
WHERE m.nilai <> 0;
