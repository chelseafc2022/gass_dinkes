import { Activity, Building2, ChartNoAxesCombined, ChevronDown, ChevronUp, CircleCheck, SlidersHorizontal, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../core/session";
import { api, errorText } from "../../core/api";
import { allowed, currentPeriod, format, months } from "../../core/domain";
import { useOptions } from "../reports/hooks";
import {
  Badge,
  EmptyState,
  Section,
  Button,
  Card,
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
  const [showFilters, setShowFilters] = useState(false);
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
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 12 }}>
            <View style={compact.header}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={compact.caption}>Selamat datang, {user.name.split(" ")[0]}</Text>
                <Text accessibilityRole="header" style={compact.title}>Ringkasan kinerja</Text>
                <Text style={compact.caption}>{user.faskes?.namaFaskes ?? "Dinas Kesehatan Konawe Selatan"}</Text>
              </View>
              <View style={compact.mark}><Activity color={colors.primary} size={22} /></View>
            </View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(!showFilters)} style={({ pressed }) => [compact.filter, pressed && { opacity: 0.7 }]}>
              <SlidersHorizontal size={16} color={colors.teal} />
              <View style={{ flex: 1 }}><Text style={compact.label}>{months[month - 1]} {year}</Text><Text style={compact.caption}>{facility ? options.data?.faskes.find((f) => f.id === facility)?.namaFaskes ?? "Faskes terpilih" : user.faskes?.namaFaskes ?? "Semua faskes"} · {category ? category.replaceAll("_", " ") : "Semua kategori"}</Text></View>
              {showFilters ? <ChevronUp size={18} color={colors.muted} /> : <ChevronDown size={18} color={colors.muted} />}
            </Pressable>
            {showFilters && <Card>
            <Section title="Periode pemantauan" subtitle="Sesuaikan ringkasan yang ingin Anda lihat." />
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
            </Card>}
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
                <View style={compact.grid}>
                  <View style={[compact.metric, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <View style={compact.metricTop}><Activity size={17} color={colors.mint} /><Text style={[compact.label, { color: colors.mint }]}>Capaian kinerja</Text></View>
                    <Text style={[compact.value, { color: colors.white }]}>{format(summary.capaian)}<Text style={{ fontSize: 16 }}> %</Text></Text>
                    <Text style={[compact.caption, { color: colors.mint }]}>Kumulatif terverifikasi</Text>
                  </View>
                  <View style={compact.metric}>
                    <View style={compact.metricTop}><Wallet size={17} color={colors.teal} /><Text style={compact.label}>Serapan</Text></View>
                    <Text style={compact.value}>{format(summary.serapan)}<Text style={{ fontSize: 16 }}> %</Text></Text>
                    <Text style={compact.caption}>Realisasi bulan ini</Text>
                  </View>
                  <View style={compact.metric}>
                    <View style={compact.metricTop}><CircleCheck size={17} color={colors.teal} /><Text style={compact.label}>Verifikasi</Text></View>
                    <Text style={compact.value}>{summary.tervalidasi}<Text style={compact.caption}> / {summary.jumlahLaporan}</Text></Text>
                    <Progress value={summary.jumlahLaporan ? summary.tervalidasi / summary.jumlahLaporan * 100 : 0} />
                  </View>
                  <View style={compact.metric}>
                    <View style={compact.metricTop}><Building2 size={17} color={colors.teal} /><Text style={compact.label}>Cakupan faskes</Text></View>
                    <Text style={compact.value}>{summary.faskes}</Text>
                    <Text style={compact.caption}>{summary.indikator} indikator dipantau</Text>
                  </View>
                </View>
                <View style={compact.finance}>
                  <Text style={compact.label}>Keuangan · {months[month - 1]}</Text>
                  <View style={compact.spread}><Text style={compact.caption}>Realisasi terverifikasi</Text><Text style={compact.amount}>Rp {format(summary.realisasiKeuangan)}</Text></View>
                  <View style={compact.spread}><Text style={compact.caption}>Pagu</Text><Text style={compact.amount}>Rp {format(summary.targetKeuangan)}</Text></View>
                </View>
                <Text style={compact.caption}>Diperbarui {new Date(query.dataUpdatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · tarik untuk memperbarui</Text>
              </>
            )}
            <View style={[compact.spread, { marginTop: 8 }]}>
              <Text accessibilityRole="header" style={compact.sectionTitle}>Capaian indikator</Text>
              <Text style={compact.caption}>{query.data?.indicators.length ?? 0} indikator</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : (
            <EmptyState title="Belum ada indikator" description="Coba pilih periode, faskes, atau kategori lain untuk melihat capaian." />
          )
        }
        renderItem={({ item: i }) => (
          <View style={compact.indicator}>
              <View style={compact.spread}>
                <Text style={compact.eyebrow}>{i.kategori.replaceAll("_", " ")}</Text>
                <Badge text={i.status === "HIJAU" ? "Tercapai" : i.status === "KUNING" ? "Perlu ditingkatkan" : "Perlu perhatian"} tone={i.status === "HIJAU" ? "success" : i.status === "KUNING" ? "warning" : "danger"} />
              </View>
              <Text style={compact.indicatorTitle}>{i.nama}</Text>
              <View style={compact.spread}>
                <Text style={compact.caption}>{i.tercapai} / {i.totalFaskes} faskes mencapai target</Text>
                <Text style={compact.percent}>{format(i.persentase)}%</Text>
              </View>
              <Progress value={i.persentase} />
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === i.id }} accessibilityLabel={`${expanded === i.id ? "Tutup" : "Lihat"} rincian ${i.nama}`} onPress={() => setExpanded(expanded === i.id ? null : i.id)} style={({ pressed }) => [compact.details, pressed && { opacity: 0.6 }]}>
                <ChartNoAxesCombined size={16} color={colors.teal} />
                <Text style={[compact.label, { flex: 1, color: colors.teal }]}>{expanded === i.id ? "Tutup rincian" : "Tren & faskes prioritas"}</Text>
                {expanded === i.id ? <ChevronUp size={16} color={colors.teal} /> : <ChevronDown size={16} color={colors.teal} />}
              </Pressable>
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
          </View>
        )}
      />
    </View>
  );
}

const compact = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.5, color: colors.text },
  caption: { fontSize: 12, lineHeight: 18, color: colors.muted },
  label: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.text },
  mark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" },
  filter: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { flexGrow: 1, flexBasis: "46%", minWidth: 140, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.white },
  metricTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  value: { fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: colors.text, fontVariant: ["tabular-nums"] },
  finance: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 8, backgroundColor: colors.white },
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  amount: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  indicator: { marginBottom: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, gap: 10 },
  eyebrow: { fontSize: 10, letterSpacing: 0.6, fontWeight: "700", color: colors.teal },
  indicatorTitle: { fontSize: 14, lineHeight: 21, fontWeight: "600", color: colors.text },
  percent: { fontSize: 18, fontWeight: "700", color: colors.primary, fontVariant: ["tabular-nums"] },
  details: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
});
