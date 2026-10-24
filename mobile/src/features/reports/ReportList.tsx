import { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { colors as c } from "../../core/theme";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "../../core/session";
import {
  allowed,
  canVerify,
  canWrite,
  currentPeriod,
  format,
  monthKeys,
  months,
  type Kind,
  type Report,
} from "../../core/domain";
import { write, errorText } from "../../core/api";
import { queryClient } from "../../core/query";
import {
  Badge,
  EmptyState,
  Section,
  Button,
  Card,
  Field,
  Heading,
  Loading,
  Message,
  Select,
  styles,
} from "../../components/ui";
import { useReports, useOptions } from "./hooks";
export default function ReportList({
  verification = false,
}: {
  verification?: boolean;
}) {
  const { user } = useSession();
  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [kind, setKind] = useState<Kind>(
    user && allowed(user, "capaian_kinerja") ? "kinerja" : "keuangan",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [facility, setFacility] = useState("");
  const [onlyPending, setOnlyPending] = useState(verification);
  const selectedMonth = month;
  const other = useReports(kind === "kinerja" ? "keuangan" : "kinerja", year);
  const countPending = (rows?: Report[]) =>
    (rows ?? []).reduce(
      (n, r) =>
        n + (r.canVerify ? r.verifikasiBulanan.filter((m) => !m.isValidated).length : 0),
      0,
    );
  const query = useReports(kind, year, facility);
  const options = useOptions();
  const mutation = useMutation({
    mutationFn: ({ r, validated, bulan }: { r: Report; validated: boolean; bulan: number }) =>
      write(
        `/capaian/${kind}/${encodeURIComponent(r.id)}/verify`,
        {
          bulan,
          validated,
          nilai: r[monthKeys[bulan - 1]],
          target: r.target,
        },
        "POST",
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (e) => Alert.alert("Verifikasi belum tersimpan", errorText(e)),
  });
  const rows = useMemo(
    () =>
      query.data?.data.filter(
        (r) =>
          (!search ||
            `${r.label} ${r.faskes.namaFaskes}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!verification ||
            (onlyPending
              ? r.verifikasiBulanan.some((m) => !m.isValidated)
              : r.verifikasiBulanan.some((m) => m.bulan === month))),
      ) ?? [],
    [query.data, search, verification, month, onlyPending],
  );
  if (
    !user ||
    !allowed(user, `capaian_${kind}`) ||
    (verification && !canVerify(user))
  )
    return <Message text="Anda tidak memiliki akses ke halaman ini." />;
  const edit = (r?: Report) =>
    router.push({
      pathname: "/report",
      params: {
        kind,
        year: String(year),
        month: String(month),
        ...(r ? { id: r.id, facility: r.faskesId } : {}),
      },
    });
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: active ? c.primary : c.border,
        backgroundColor: active ? c.primary : c.white,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: active ? c.white : c.text }}>
        {label}
      </Text>
    </Pressable>
  );
  const kindCount = (k: Kind) =>
    verification
      ? ` (${countPending(k === kind ? query.data?.data : other.data?.data)})`
      : "";
  const header = (
    <View style={{ gap: 10, paddingBottom: 10 }}>
      <Heading
        title={verification ? "Tinjau & verifikasi" : "Laporan bulanan"}
        subtitle={
          verification
            ? "Periksa nilai sebelum mengesahkan."
            : "Input capaian kinerja dan realisasi keuangan."
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["kinerja", "keuangan"] as const)
          .filter((k) => allowed(user, `capaian_${k}`))
          .map((k) =>
            chip(
              `${k === "kinerja" ? "Kinerja" : "Keuangan"}${kindCount(k)}`,
              kind === k,
              () => setKind(k),
            ),
          )}
        {verification &&
          chip("Belum diverifikasi", onlyPending, () => setOnlyPending(!onlyPending))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Cari"
            value={search}
            onChangeText={setSearch}
            placeholder="Indikator atau faskes"
            style={{ minHeight: 40, paddingVertical: 6 }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter periode dan faskes"
          onPress={() => setShowFilters(!showFilters)}
          style={{ alignSelf: "flex-end", height: 40, paddingHorizontal: 12, borderRadius: 10, backgroundColor: showFilters ? c.primary : c.mint, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: showFilters ? c.white : c.primary }}>
            {months[month - 1].slice(0, 3)} {year} ▾
          </Text>
        </Pressable>
      </View>
      {showFilters && (
        <View style={[styles.card, { padding: 10, gap: 8 }]}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Select
                compact
                label="Tahun"
                value={String(year)}
                onChange={(v) => setYear(Number(v))}
                items={Array.from({ length: 6 }, (_, i) => ({
                  label: String(initial.year + 1 - i),
                  value: String(initial.year + 1 - i),
                }))}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Select
                compact
                label="Bulan"
                value={String(month)}
                onChange={(v) => setMonth(Number(v))}
                items={months.map((label, i) => ({ label, value: String(i + 1) }))}
              />
            </View>
          </View>
          {user.role !== "OPERATOR_PUSKESMAS" && (
            <Select
              compact
              label="Faskes"
              value={facility}
              onChange={setFacility}
              items={[
                { value: "", label: "Semua faskes" },
                ...(options.data?.faskes ?? []).map((f) => ({
                  value: f.id,
                  label: f.namaFaskes,
                })),
              ]}
            />
          )}
        </View>
      )}
      {!verification && canWrite(user) && (
        <Button title="+ Input laporan" onPress={() => edit()} />
      )}
      {query.isError && (
        <>
          <Message error text={errorText(query.error)} />
          <Button
            secondary
            title="Coba lagi"
            onPress={() => void query.refetch()}
          />
        </>
      )}
      {!!query.data && <Message text={`${rows.length} laporan`} />}
    </View>
  );
  return (
    <View style={styles.page}>
      <FlashList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 14 }}
        ListHeaderComponent={header}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : (
            <EmptyState icon={verification ? "shield" : "report"} title={verification ? "Belum ada laporan untuk ditinjau" : "Belum ada laporan"} description="Sesuaikan periode atau kata pencarian untuk menemukan laporan." />
          )
        }
        renderItem={({ item: r }) => {
          const pendingMonth = verification && onlyPending
            ? r.verifikasiBulanan.find((x) => !x.isValidated)?.bulan
            : undefined;
          const month = pendingMonth ?? selectedMonth;
          const m = r.verifikasiBulanan.find((x) => x.bulan === month);
          const submitted = !!m?.submittedAt || (verification && !!m);
          const canEdit = !verification && canWrite(user);
          const canSign = verification && r.canVerify && submitted;
          const confirm = () =>
            Alert.alert(
              m?.isValidated ? "Batalkan verifikasi?" : "Sahkan laporan?",
              `${r.label}\n${months[month - 1]} ${year}\nNilai: ${format(r[monthKeys[month - 1]])}\nTarget: ${format(r.target)}`,
              [
                { text: "Kembali", style: "cancel" },
                {
                  text: "Konfirmasi",
                  onPress: () =>
                    mutation.mutate({ r, validated: !m?.isValidated, bulan: month }),
                },
              ],
            );
          return (
            <Pressable
              accessibilityRole="button"
              disabled={!canEdit}
              onPress={() => edit(r)}
              style={({ pressed }) => [
                styles.card,
                { marginBottom: 8, padding: 10, gap: 6 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: c.teal, fontSize: 11, fontWeight: "700" }} numberOfLines={1}>
                    {r.faskes.namaFaskes}
                  </Text>
                  <Text style={[styles.h2, { fontSize: 13, lineHeight: 18 }]} numberOfLines={2}>
                    {r.label}
                  </Text>
                </View>
                <Badge
                  text={m?.isValidated ? "Terverifikasi" : submitted ? "Menunggu" : "Belum dikirim"}
                  tone={m?.isValidated ? "success" : submitted ? "warning" : "neutral"}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-end" }}>
                <View>
                  <Text style={styles.muted}>{months[month - 1]}</Text>
                  <Text style={[styles.h2, { fontSize: 15 }]}>
                    {submitted ? format(r[monthKeys[month - 1]]) : "—"}
                    {submitted && kind === "keuangan" ? " Rp" : ""}
                  </Text>
                </View>
                <View>
                  <Text style={styles.muted}>Target tahunan</Text>
                  <Text style={[styles.text, { fontWeight: "600" }]}>{format(r.target)}</Text>
                </View>
              </View>
              {m?.verifiedBy && (
                <Text style={[styles.muted, { fontSize: 11 }]}>Diperiksa oleh {m.verifiedBy.name}</Text>
              )}
              {canSign ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={mutation.isPending || query.isFetching}
                  onPress={confirm}
                  style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: m?.isValidated ? c.mint : c.primary }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: m?.isValidated ? c.primary : c.white }}>
                    {m?.isValidated ? "Batalkan verifikasi" : "Verifikasi"}
                  </Text>
                </Pressable>
              ) : (
                canEdit && (
                  <Text style={{ color: c.teal, fontSize: 12, fontWeight: "700" }}>Buka / koreksi ›</Text>
                )
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
