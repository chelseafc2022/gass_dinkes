import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
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
  const query = useReports(kind, year, facility);
  const options = useOptions();
  const mutation = useMutation({
    mutationFn: ({ r, validated }: { r: Report; validated: boolean }) =>
      write(
        `/capaian/${kind}/${encodeURIComponent(r.id)}/verify`,
        {
          bulan: month,
          validated,
          nilai: r[monthKeys[month - 1]],
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
            r.verifikasiBulanan.some(
              (m) => m.bulan === month && !!m.submittedAt,
            )),
      ) ?? [],
    [query.data, search, verification, month],
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
  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <Heading
        title={verification ? "Tinjau & verifikasi" : "Laporan bulanan"}
        subtitle={
          verification
            ? "Periksa nilai bulan terpilih sebelum mengesahkan."
            : "Input capaian kinerja dan realisasi keuangan."
        }
      />
      <Button secondary title={`${kind === "kinerja" ? "Kinerja" : "Keuangan"} · ${months[month - 1]} ${year} · ${showFilters ? "Tutup" : "Filter"}`} onPress={() => setShowFilters(!showFilters)} />
      {showFilters && <Card>
      <Section title="Filter laporan" />
      <Select
        label="Jenis laporan"
        value={kind}
        onChange={(v) => setKind(v as Kind)}
        items={(["kinerja", "keuangan"] as const)
          .filter((k) => allowed(user, `capaian_${k}`))
          .map((k) => ({
            value: k,
            label: k === "kinerja" ? "Capaian kinerja" : "Capaian keuangan",
          }))}
      />
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 120 }}>
          <Select
            label="Tahun"
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            items={Array.from({ length: 6 }, (_, i) => ({
              label: String(initial.year + 1 - i),
              value: String(initial.year + 1 - i),
            }))}
          />
        </View>
        <View style={{ flex: 1, minWidth: 150 }}>
          <Select
            label="Bulan"
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            items={months.map((label, i) => ({ label, value: String(i + 1) }))}
          />
        </View>
      </View>
      {user.role !== "OPERATOR_PUSKESMAS" && (
        <Select
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
      </Card>}
      <Field
        label="Cari laporan"
        value={search}
        onChangeText={setSearch}
        placeholder="Indikator atau nama faskes"
      />
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
      {!!query.data && (
        <Message
          text={`${rows.length} laporan • tarik ke bawah untuk memperbarui`}
        />
      )}
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
          const m = r.verifikasiBulanan.find((x) => x.bulan === month);
          const submitted = !!m?.submittedAt;
          return (
            <View style={{ marginBottom: 8 }}>
              <Card>
                <Text style={styles.badge}>{r.faskes.namaFaskes}</Text>
                <Text style={styles.h2}>{r.label}</Text>
                <Badge text={m?.isValidated ? "Terverifikasi" : submitted ? "Menunggu verifikasi" : "Belum dikirim"} tone={m?.isValidated ? "success" : submitted ? "warning" : "neutral"} />
                <Text style={styles.h2}>
                  {months[month - 1]}:{" "}
                  {submitted
                    ? format(r[monthKeys[month - 1]])
                    : "Belum diinput"}
                  {kind === "keuangan" ? " Rp" : ""}
                </Text>
                <Text style={styles.muted}>
                  Target tahunan: {format(r.target)} •{" "}
                  {m?.isValidated
                    ? "Terverifikasi"
                    : submitted
                      ? "Menunggu verifikasi"
                      : "Belum dikirim"}
                </Text>
                {m?.verifiedBy && (
                  <Message text={`Diperiksa oleh ${m.verifiedBy.name}`} />
                )}
                {verification && r.canVerify && submitted ? (
                  <Button
                    title={
                      m?.isValidated
                        ? "Batalkan verifikasi"
                        : "Verifikasi bulan ini"
                    }
                    disabled={mutation.isPending || query.isFetching}
                    onPress={() =>
                      Alert.alert(
                        m?.isValidated
                          ? "Batalkan verifikasi?"
                          : "Sahkan laporan?",
                        `${r.label}\n${months[month - 1]} ${year}\nNilai: ${format(r[monthKeys[month - 1]])}\nTarget: ${format(r.target)}`,
                        [
                          { text: "Kembali", style: "cancel" },
                          {
                            text: "Konfirmasi",
                            onPress: () =>
                              mutation.mutate({
                                r,
                                validated: !m?.isValidated,
                              }),
                          },
                        ],
                      )
                    }
                  />
                ) : (
                  !verification &&
                  canWrite(user) && (
                    <Button
                      secondary
                      title="Buka / koreksi"
                      onPress={() => edit(r)}
                    />
                  )
                )}
              </Card>
            </View>
          );
        }}
      />
    </View>
  );
}
