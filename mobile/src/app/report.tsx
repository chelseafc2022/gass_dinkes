import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "../core/session";
import {
  allowed,
  canWrite,
  decimal,
  monthKeys,
  months,
  reportInput,
  type Kind,
  type ReportInput,
} from "../core/domain";
import { write, errorText } from "../core/api";
import { queryClient } from "../core/query";
import { useReports, useOptions } from "../features/reports/hooks";
import {
  deleteDraft,
  listDrafts,
  saveDraft,
  type Draft,
} from "../features/drafts/storage";
import {
  Button,
  Card,
  Field,
  Heading,
  Loading,
  Message,
  Page,
  Select,
  styles,
} from "../components/ui";
export default function ReportForm() {
  const params = useLocalSearchParams<{
    kind: string;
    year: string;
    month: string;
    id?: string;
    facility?: string;
    draft?: string;
  }>();
  const { user } = useSession();
  const kind: Kind = params.kind === "keuangan" ? "keuangan" : "kinerja";
  const year = Number(params.year);
  const month = Number(params.month);
  const [entity, setEntity] = useState("");
  const [facility, setFacility] = useState(
    user?.faskesId ?? params.facility ?? "",
  );
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftLoading, setDraftLoading] = useState(params.draft !== undefined);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState<string | null | undefined>(
    undefined,
  );
  const [loaded, setLoaded] = useState("");
  const validPeriod =
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12;
  const query = useReports(kind, validPeriod ? year : 2000, facility);
  const options = useOptions();
  useEffect(() => {
    if (!user || params.draft === undefined) return;
    let active = true;
    void listDrafts(user.id)
      .then((ds) => {
        if (!active) return;
        const d = ds.find((x) => x.slot === Number(params.draft));
        if (
          !d ||
          d.kind !== kind ||
          d.input.tahun !== year ||
          d.input.bulan !== month
        )
          throw new Error("Draf tidak ditemukan atau sudah kedaluwarsa.");
        setDraft(d);
        setEntity(d.input.entityId);
        setFacility(d.input.faskesId);
        setValue(String(d.input.nilai));
        setTarget(d.input.target === undefined ? "" : String(d.input.target));
        setBaseline(d.input.expectedUpdatedAt);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setDraftLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.draft, user, kind, year, month]);
  // Capture the server snapshot only when selecting a different report; refetches must not overwrite edits.
  if (params.draft === undefined && query.data) {
    const selected = params.id
      ? query.data.data.find((r) => r.id === params.id)
      : query.data.data.find(
          (r) =>
            (r.indikatorId ?? r.subKegiatanId) === entity &&
            r.faskesId === facility,
        );
    const selectedEntity =
      selected?.indikatorId ?? selected?.subKegiatanId ?? entity;
    const selectedFacility = selected?.faskesId ?? facility;
    const key = `${selectedEntity}|${selectedFacility}|${selected?.id ?? "new"}`;
    if (loaded !== key && (!params.id || selected)) {
      setLoaded(key);
      setBaseline(selected?.updatedAt ?? null);
      setEntity(selectedEntity);
      setFacility(selectedFacility);
      setValue(
        selected?.verifikasiBulanan.some((m) => m.bulan === month)
          ? String(selected[monthKeys[month - 1]])
          : "",
      );
      setTarget(selected ? String(selected.target) : "");
    }
  }
  const row = query.data?.data.find(
    (r) =>
      (r.indikatorId ?? r.subKegiatanId) === entity && r.faskesId === facility,
  );
  const label =
    draft?.label ??
    query.data?.available.find((e) => e.id === entity)?.namaIndikator ??
    query.data?.available.find((e) => e.id === entity)?.namaSubKegiatan ??
    row?.label ??
    "Laporan";
  const mutation = useMutation({
    mutationFn: (input: ReportInput) => write(`/capaian/${kind}`, input),
    onSuccess: async () => {
      if (user && draft) await deleteDraft(user.id, draft.slot);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["drafts"] }),
      ]);
      Alert.alert("Laporan tersimpan", "Data sudah diterima server.");
      router.back();
    },
    onError: (e) => setError(errorText(e)),
  });
  if (
    !user ||
    !canWrite(user) ||
    !allowed(user, `capaian_${kind}`) ||
    !validPeriod
  )
    return (
      <Message
        error
        text="Laporan tidak tersedia untuk akun atau periode ini."
      />
    );
  if (draftLoading) return <Loading />;
  const input = () =>
    reportInput.parse({
      entityId: entity,
      faskesId: facility,
      tahun: year,
      bulan: month,
      nilai: decimal(value),
      ...(baseline === null || draft?.input.target !== undefined
        ? { target: decimal(target) }
        : {}),
      expectedUpdatedAt: baseline,
    });
  const ready =
    !!entity &&
    !!facility &&
    baseline !== undefined &&
    !(params.draft !== undefined && !draft);
  const locked =
    user.role === "OPERATOR_PUSKESMAS" &&
    (row?.verifikasiBulanan.some((m) => m.bulan === month && m.isValidated) ||
      query.data?.months.find((m) => m.bulan === month)?.open === false);
  async function keep() {
    setSaving(true);
    setError("");
    try {
      await saveDraft(user!.id, { kind, label, input: input() });
      await queryClient.invalidateQueries({ queryKey: ["drafts"] });
      Alert.alert(
        "Draf tersimpan",
        "Draf tersimpan aman di perangkat, belum dikirim ke server.",
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }
  function send() {
    setError("");
    try {
      const payload = input();
      Alert.alert(
        "Kirim laporan?",
        `${label}\n${months[month - 1]} ${year}\nNilai: ${value}`,
        [
          { text: "Periksa lagi", style: "cancel" },
          { text: "Kirim", onPress: () => mutation.mutate(payload) },
        ],
      );
    } catch {
      setError(
        "Periksa nilai dan target: gunakan angka positif, maksimal 2 desimal, tanpa pemisah ribuan.",
      );
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page>
        <Heading
          title={kind === "kinerja" ? "Capaian kinerja" : "Realisasi keuangan"}
          subtitle={`${months[month - 1]} ${year}`}
        />
        {draft ? (
          <Card>
            <Text style={styles.h2}>{label}</Text>
            <Message text="Draf lokal. Server akan memeriksa versi laporan, periode, dan kewenangan saat pengiriman." />
          </Card>
        ) : (
          <Card>
            {params.id ? (
              <Text style={styles.h2}>{row?.label ?? "Memuat laporan…"}</Text>
            ) : (
              <>
                <Select
                  label="Faskes"
                  value={facility}
                  onChange={setFacility}
                  items={[
                    { label: "Pilih faskes", value: "" },
                    ...(options.data?.faskes ?? []).map((f) => ({
                      value: f.id,
                      label: f.namaFaskes,
                    })),
                  ]}
                />
                <Select
                  label={kind === "kinerja" ? "Indikator" : "Sub kegiatan"}
                  value={entity}
                  onChange={setEntity}
                  items={[
                    { label: "Pilih laporan", value: "" },
                    ...(query.data?.available ?? []).map((e) => ({
                      value: e.id,
                      label: e.namaIndikator ?? e.namaSubKegiatan ?? e.id,
                    })),
                  ]}
                />
              </>
            )}
            {query.isPending && <Loading />}
            {query.isError && (
              <>
                <Message error text={errorText(query.error)} />
                <Button
                  title="Muat ulang"
                  secondary
                  onPress={() => void query.refetch()}
                />
              </>
            )}
          </Card>
        )}
        <Card>
          {baseline === null || draft?.input.target !== undefined ? (
            <Field
              label={
                kind === "kinerja" ? "Target tahunan" : "Pagu tahunan (Rp)"
              }
              value={target}
              onChangeText={setTarget}
              keyboardType="decimal-pad"
              maxLength={18}
            />
          ) : (
            <Message text={`Target tahunan: ${target}`} />
          )}
          <Field
            label={
              kind === "kinerja"
                ? "Realisasi bulan ini"
                : "Realisasi bulan ini (Rp)"
            }
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            maxLength={18}
            placeholder="0"
          />
          <Message text="Isi 0 untuk laporan nihil. Gunakan koma atau titik untuk desimal, tanpa pemisah ribuan." />
          {locked && (
            <Message
              error
              text="Bulan ini dikunci atau periode ditutup. Hubungi bidang/Admin Dinkes untuk koreksi."
            />
          )}
          {!!error && <Message error text={error} />}
          <Button
            title={mutation.isPending ? "Mengirim…" : "Kirim ke server"}
            onPress={send}
            disabled={!ready || locked || saving || mutation.isPending}
          />
          <Button
            secondary
            title={saving ? "Menyimpan…" : "Simpan draf di perangkat"}
            onPress={() => void keep()}
            disabled={!ready || saving || mutation.isPending}
          />
          <Message text="Draf tidak dikirim otomatis. Bila laporan berubah di server, buka ulang laporan terbaru untuk melakukan koreksi." />
        </Card>
      </Page>
    </KeyboardAvoidingView>
  );
}
