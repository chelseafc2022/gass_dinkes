CREATE TABLE "ThresholdTriwulan" (
    "triwulan" INTEGER NOT NULL,
    "hijauMin" DOUBLE PRECISION NOT NULL,
    "kuningMin" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThresholdTriwulan_pkey" PRIMARY KEY ("triwulan"),
    CONSTRAINT "ThresholdTriwulan_quarter_check" CHECK ("triwulan" BETWEEN 1 AND 4),
    CONSTRAINT "ThresholdTriwulan_green_check" CHECK ("hijauMin" > 0 AND "hijauMin" <= 100),
    CONSTRAINT "ThresholdTriwulan_yellow_check" CHECK (
        "kuningMin" IS NULL OR ("kuningMin" >= 0 AND "kuningMin" < "hijauMin")
    )
);

INSERT INTO "ThresholdTriwulan" ("triwulan", "hijauMin", "kuningMin")
VALUES (1, 100, 25), (2, 100, 50), (3, 100, 75), (4, 100, NULL);
