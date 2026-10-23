import { useState } from "react";
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../core/session";
import { api, errorText } from "../../core/api";
import { allowed, currentPeriod, format, months } from "../../core/domain";
import { useOptions } from "../reports/hooks";
import {
  Button,
  Card,
  Heading,
  Loading,
  Message,
  Progress,
  Select,
  styles,
} from "../../components/ui";
import { colors } from "../../core/theme";
type DashboardData = {
  summary: {
    faskes: number;
    indikator: number;
    capaian: number;
    serapan: number;
    targetKeuangan: number;
    realisasiKeuangan: number;
    tervalidasi: number;
    jumlahLaporan: number;
  };
  indicators: {
    id: string;
    nama: string;
    kategori: string;
    persentase: number;
    status: string;
    tercapai: number;
    totalFaskes: number;
    ranking: {
      faskesId: string;
      namaFaskes: string;
      persentase: number;
      reported: boolean;
    }[];
    trend: { triwulan: string; value: number }[];
  }[];
};
export default function Dashboard() {
  const { user } = useSession();
  const now = currentPeriod();
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [facility, setFacility] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const options = useOptions();
  const query = useQuery({
    queryKey: ["dashboard", user?.id, year, month, facility, category],
    queryFn: ({ signal }) =>
      api<DashboardData>(
        `/dashboard?tahun=${year}&bulan=${month}${facility ? `&faskesId=${encodeURIComponent(facility)}` : ""}${category ? `&kategori=${category}` : ""}`,
        { signal },
      ),
    enabled: !!user && allowed(user, "dashboard"),
  });
  if (!user || !allowed(user, "dashboard"))
    return (
      <Message text="Dashboard tidak diaktifkan untuk akun ini. Gunakan menu sesuai kewenangan Anda." />
    );
  const summary = query.data?.summary;
  return (
    <View style={styles.page}>
      <FlashList
        data={query.data?.indicators ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 20 }}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 16 }}>
            <Text style={styles.badge}>GASS / MONITORING KESEHATAN</Text>
            <Heading
              title={`Halo, ${user.name.split(" ")[0]}`}
              subtitle={
                user.faskes?.namaFaskes ??
                "Dinas Kesehatan Kabupaten Konawe Selatan"
              }
            />
            <View style={styles.row}>
              <View style={{ flex: 1, minWidth: 100 }}>
                <Select
                  label="Tahun"
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  items={Array.from({ length: 6 }, (_, i) => ({
                    label: String(now.year + 1 - i),
                    value: String(now.year + 1 - i),
                  }))}
                />
              </View>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Select
                  label="Sampai bulan"
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  items={months.map((label, i) => ({
                    label,
                    value: String(i + 1),
                  }))}
                />
              </View>
            </View>
            {user.role !== "OPERATOR_PUSKESMAS" && (
              <Select
                label="Faskes"
                value={facility}
                onChange={setFacility}
                items={[
                  { label: "Semua faskes", value: "" },
                  ...(options.data?.faskes ?? []).map((f) => ({
                    label: f.namaFaskes,
                    value: f.id,
                  })),
                ]}
              />
            )}
            <Select
              label="Kategori indikator"
              value={category}
              onChange={setCategory}
              items={[
                { label: "Semua kategori", value: "" },
                ...["SPM", "IKU", "IKK", "INDIKATOR_PROGRAM"].map((k) => ({
                  label: k.replaceAll("_", " "),
                  value: k,
                })),
              ]}
            />
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
            {summary && (
              <>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.primary, borderWidth: 0 },
                  ]}
                >
                  <Text style={{ color: colors.mint, fontSize: 14 }}>
                    CAPAIAN KINERJA TERVERIFIKASI
                  </Text>
                  <Text
                    style={{ color: "white", fontSize: 44, fontWeight: "800" }}
                  >
                    {format(summary.capaian)}%
                  </Text>
                  <Text style={{ color: colors.mint }}>
                    Kumulatif Januari–{months[month - 1]} {year}
                  </Text>
                  <Text style={{ color: "white" }}>
                    {summary.faskes} faskes • {summary.indikator} indikator
                  </Text>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1, minWidth: 145 }}>
                    <Card>
                      <Text style={styles.muted}>Verifikasi bulanan</Text>
                      <Text style={styles.h2}>
                        {summary.tervalidasi} / {summary.jumlahLaporan}
                      </Text>
                      <Progress
                        value={
                          summary.jumlahLaporan
                            ? (summary.tervalidasi / summary.jumlahLaporan) *
                              100
                            : 0
                        }
                      />
                    </Card>
                  </View>
                  <View style={{ flex: 1, minWidth: 145 }}>
                    <Card>
                      <Text style={styles.muted}>Serapan bulan ini</Text>
                      <Text style={styles.h2}>{format(summary.serapan)}%</Text>
                      <Progress value={summary.serapan} />
                    </Card>
                  </View>
                </View>
                <Message
                  text={`Keuangan ${months[month - 1]}: Rp ${format(summary.realisasiKeuangan)} / pagu Rp ${format(summary.targetKeuangan)}. Hanya realisasi terverifikasi yang dihitung.`}
                />
                <Message
                  text={`Diperbarui ${new Date(query.dataUpdatedAt).toLocaleTimeString("id-ID")} • tarik untuk memperbarui`}
                />
              </>
            )}
            <Heading
              title="Capaian indikator"
              subtitle="Status mengikuti threshold triwulan resmi dari server."
            />
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : (
            <Message text="Belum ada indikator untuk filter ini." />
          )
        }
        renderItem={({ item: i }) => (
          <View style={{ marginBottom: 12 }}>
            <Card>
              <Text style={styles.badge}>
                {i.kategori} •{" "}
                {i.status === "HIJAU"
                  ? "Target tercapai"
                  : i.status === "KUNING"
                    ? "Perlu ditingkatkan"
                    : "Perlu perhatian"}
              </Text>
              <Text style={styles.h2}>{i.nama}</Text>
              <Text style={styles.title}>{format(i.persentase)}%</Text>
              <Progress value={i.persentase} />
              <Message
                text={`${i.tercapai} dari ${i.totalFaskes} faskes mencapai target`}
              />
              <Button
                secondary
                title={
                  expanded === i.id
                    ? "Tutup rincian"
                    : "Lihat tren & 5 faskes prioritas"
                }
                onPress={() => setExpanded(expanded === i.id ? null : i.id)}
              />
              {expanded === i.id && (
                <>
                  <Text style={styles.h2}>Tren kumulatif</Text>
                  {i.trend.map((t) => (
                    <View key={t.triwulan} style={{ gap: 5 }}>
                      <Message text={`${t.triwulan}: ${format(t.value)}%`} />
                      <Progress value={t.value} />
                    </View>
                  ))}
                  <Text style={styles.h2}>Prioritas pemantauan</Text>
                  {i.ranking.slice(0, 5).map((r, index) => (
                    <Message
                      key={r.faskesId ?? index}
                      text={`${r.namaFaskes}: ${r.reported ? `${format(r.persentase)}%` : "Belum melaporkan"}`}
                    />
                  ))}
                </>
              )}
            </Card>
          </View>
        )}
      />
    </View>
  );
}
