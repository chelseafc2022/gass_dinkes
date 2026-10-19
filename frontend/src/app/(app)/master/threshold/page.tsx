"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, write } from "@/lib/api";
import { useAuth } from "@/components/gass/providers";
import { ErrorState, Loading } from "@/components/gass/shared";
import {
  quarterLabel,
  ThresholdRanges,
  ThresholdRule,
} from "@/components/gass/threshold-legend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DraftRule = {
  triwulan: number;
  hijauMin: string;
  kuningMin: string | null;
};

export default function ThresholdMaster() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState<DraftRule[] | null>(null);
  const [validation, setValidation] = useState("");
  const q = useQuery({
    queryKey: ["master", "threshold"],
    queryFn: () => api<{ rules: ThresholdRule[] }>("/master/threshold"),
    enabled: user?.role === "ADMIN_DINKES",
  });
  const rules =
    draft ??
    q.data?.rules.map((r) => ({
      ...r,
      hijauMin: String(r.hijauMin),
      kuningMin: r.kuningMin === null ? null : String(r.kuningMin),
    })) ??
    [];
  const save = useMutation({
    mutationFn: (values: ThresholdRule[]) =>
      write("/master/threshold", { rules: values }),
    onSuccess: (data) => {
      client.setQueryData(["master", "threshold"], data);
      client.invalidateQueries({ queryKey: ["capaian"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
      setDraft(null);
      toast.success("Threshold triwulan berhasil disimpan.");
    },
    onError: (e) => toast.error(e.message),
  });
  const change = (quarter: number, patch: Partial<DraftRule>) => {
    setValidation("");
    setDraft(
      rules.map((r) => (r.triwulan === quarter ? { ...r, ...patch } : r)),
    );
  };

  if (!user) return <Loading />;
  if (user.role !== "ADMIN_DINKES")
    return (
      <p role="alert">Master threshold hanya dapat dikelola Admin Dinkes.</p>
    );

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">DATA MASTER</p>
        <h1 className="page-heading">Threshold triwulan</h1>
        <p className="page-description">
          Atur batas persentase capaian kinerja untuk seluruh indikator dalam
          satu tempat.
        </p>
      </div>
      <div className="rounded-xl border bg-primary/5 p-4 text-sm leading-6">
        Penilaian menggunakan realisasi kumulatif sejak Januari dibanding target
        tahunan. Tampilan tahunan mengikuti Triwulan IV. Perubahan berlaku untuk
        seluruh tahun laporan. Batas merah mengikuti batas bawah kuning, atau
        batas hijau bila kuning tidak digunakan.
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const values = rules.map((r) => ({
              ...r,
              hijauMin: Number(r.hijauMin),
              kuningMin: r.kuningMin === null ? null : Number(r.kuningMin),
            }));
            if (
              rules.some((r) => r.hijauMin === "" || r.kuningMin === "") ||
              values.some(
                (r) =>
                  !Number.isFinite(r.hijauMin) ||
                  r.hijauMin <= 0 ||
                  r.hijauMin > 100 ||
                  (r.kuningMin !== null &&
                    (!Number.isFinite(r.kuningMin) ||
                      r.kuningMin < 0 ||
                      r.kuningMin >= r.hijauMin)),
              )
            ) {
              setValidation(
                "Isi batas hijau lebih dari 0 hingga 100%. Batas kuning harus minimal 0% dan lebih kecil dari batas hijau.",
              );
              return;
            }
            save.mutate(values);
          }}
        >
          <fieldset
            disabled={save.isPending}
            className="grid min-w-0 gap-5 lg:grid-cols-2"
          >
            {rules.map((rule) => (
              <div
                key={rule.triwulan}
                className="min-w-0 space-y-4 rounded-xl border bg-card p-5"
              >
                <h2 className="font-semibold">{quarterLabel(rule.triwulan)}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`green-${rule.triwulan}`}>
                      Batas bawah hijau (%) *
                    </Label>
                    <Input
                      id={`green-${rule.triwulan}`}
                      type="number"
                      required
                      min="0.01"
                      max="100"
                      step="0.01"
                      value={rule.hijauMin}
                      onChange={(e) =>
                        change(rule.triwulan, { hijauMin: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`yellow-${rule.triwulan}`}>
                      Batas bawah kuning (%) {rule.kuningMin !== null && "*"}
                    </Label>
                    <Input
                      id={`yellow-${rule.triwulan}`}
                      type="number"
                      required={rule.kuningMin !== null}
                      disabled={rule.kuningMin === null}
                      min="0"
                      max="100"
                      step="0.01"
                      value={rule.kuningMin ?? ""}
                      placeholder="Tidak digunakan"
                      onChange={(e) =>
                        change(rule.triwulan, { kuningMin: e.target.value })
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={rule.kuningMin !== null}
                    onChange={(e) =>
                      change(rule.triwulan, {
                        kuningMin: e.target.checked
                          ? String(
                              Math.min(
                                rule.triwulan * 25,
                                Math.max(0, Number(rule.hijauMin) - 1),
                              ),
                            )
                          : null,
                      })
                    }
                  />
                  Gunakan status kuning untuk {quarterLabel(rule.triwulan)}
                </label>
                <div className="border-t pt-4">
                  <ThresholdRanges
                    rule={{
                      ...rule,
                      hijauMin: Number(rule.hijauMin),
                      kuningMin:
                        rule.kuningMin === null ? null : Number(rule.kuningMin),
                    }}
                  />
                </div>
              </div>
            ))}
          </fieldset>
          {(validation || save.error) && (
            <p role="alert" className="text-sm text-destructive">
              {validation || save.error?.message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!draft || save.isPending}
              onClick={() => {
                setDraft(null);
                setValidation("");
                save.reset();
              }}
            >
              Batalkan perubahan
            </Button>
            <Button type="submit" disabled={!draft || save.isPending}>
              {save.isPending ? "Menyimpan…" : "Simpan threshold"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
