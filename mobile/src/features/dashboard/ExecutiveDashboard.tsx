import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
// AI Agent ditunda. Aktifkan kembali import ini bersama tombol Tanya AI.
// import { router } from "expo-router";
import { ChevronDown, ChevronUp, Wallet, CircleCheck } from "lucide-react-native";
import { useSession } from "../../core/session";
import { api, errorText } from "../../core/api";
import { currentPeriod, format, months } from "../../core/domain";
import { Button, Loading, Message, Select } from "../../components/ui";
import { colors } from "../../core/theme";

type Data = {
  summary: {
    capaian: number;
    serapan: number;
    targetKeuangan: number;
    realisasiKeuangan: number;
    tervalidasi: number;
    jumlahLaporan: number;
    faskes: number;
    indikator: number;
  };
  indicators: {
    id: string;
    nama: string;
    satuan?: string;
    target: number;
    realisasi: number;
    persentase: number;
    status: string;
    tercapai: number;
    totalFaskes: number;
    ranking: {
      faskesId: string;
      namaFaskes: string;
      target: number;
      realisasi: number;
      persentase: number;
      status: string;
      reported: boolean;
    }[];
    trend: { triwulan: string; value: number }[];
  }[];
};

const AMBER = "#B45309";
const toneOf = (p: number) => (p >= 100 ? colors.primary : p >= 70 ? AMBER : colors.danger);
const labelOf = (p: number) => (p >= 100 ? "Tercapai" : p >= 70 ? "Cukup" : "Lemah");

function IndicatorBar({
  indicator,
  expanded,
  onToggle,
}: {
  indicator: Data["indicators"][0];
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = toneOf(indicator.persentase);
  const statusLabel = labelOf(indicator.persentase);
  const weakRanking = indicator.ranking
    .filter((r) => r.reported)
    .sort((a, b) => a.persentase - b.persentase)
    .slice(0, 3);

  return (
    <View style={s.itemCard}>
      <Pressable onPress={onToggle} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        <View style={s.spread}>
          <Text style={s.barName} numberOfLines={2}>
            {indicator.nama}
          </Text>
          <View style={s.badgeWrap}>
            <Text style={[s.barValue, { color: tone }]}>{format(indicator.persentase)}%</Text>
            <View style={[s.pill, { backgroundColor: tone + "18" }]}>
              <Text style={[s.pillText, { color: tone }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={s.track}>
          <View
            style={[
              s.fill,
              {
                width: `${Math.max(2, Math.min(100, indicator.persentase))}%`,
                backgroundColor: tone,
              },
            ]}
          />
        </View>

        {/* Realisasi vs Target */}
        <View style={s.numRow}>
          <View style={s.numItem}>
            <Text style={s.numLabel}>Realisasi</Text>
            <Text style={[s.numValue, { color: tone }]}>
              {format(indicator.realisasi)} {indicator.satuan ?? ""}
            </Text>
          </View>
          <View style={s.numDivider} />
          <View style={s.numItem}>
            <Text style={s.numLabel}>Target</Text>
            <Text style={s.numValue}>
              {format(indicator.target)} {indicator.satuan ?? ""}
            </Text>
          </View>
          <View style={s.numDivider} />
          <View style={s.numItem}>
            <Text style={s.numLabel}>Faskes Capai</Text>
            <Text style={s.numValue}>
              {indicator.tercapai} / {indicator.totalFaskes}
            </Text>
          </View>
        </View>

        <View style={[s.spread, { marginTop: 4 }]}>
          <Text style={s.toggleHint}>
            {expanded ? "Tutup rincian faskes" : "Ketuk untuk melihat faskes terlemah"}
          </Text>
          {expanded ? (
            <ChevronUp size={15} color={colors.teal} />
          ) : (
            <ChevronDown size={15} color={colors.muted} />
          )}
        </View>
      </Pressable>

      {/* Expanded: Faskes terlemah di indikator ini */}
      {expanded && (
        <View style={s.expandedBox}>
          <Text style={s.expandedTitle}>3 Faskes Terlemah di Indikator Ini:</Text>
          {weakRanking.length === 0 ? (
            <Text style={s.caption}>Belum ada data faskes yang melapor.</Text>
          ) : (
            weakRanking.map((r, idx) => (
              <View key={r.faskesId || idx} style={s.weakFaskesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.weakFaskesName}>{r.namaFaskes}</Text>
                  <Text style={s.weakFaskesNumbers}>
                    Realisasi: <Text style={s.bold}>{format(r.realisasi)}</Text> · Target:{" "}
                    <Text style={s.bold}>{format(r.target)}</Text> {indicator.satuan ?? ""}
                  </Text>
                </View>
                <Text style={[s.weakFaskesPercent, { color: toneOf(r.persentase) }]}>
                  {format(r.persentase)}%
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function ExecutiveDashboard() {
  const { user } = useSession();
  const now = currentPeriod();
  const [month, setMonth] = useState(now.month);
  const [quarter, setQuarter] = useState("");
  const year = now.year;
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["dashboard", user?.id, year, quarter ? `q${quarter}` : month, "", ""],
    queryFn: ({ signal }) =>
      api<Data>(
        `/dashboard?tahun=${year}&${quarter ? `triwulan=${quarter}` : `bulan=${month}`}`,
        { signal },
      ),
    enabled: !!user,
  });

  const data = query.data;

  const sorted = useMemo(
    () => [...(data?.indicators ?? [])].sort((a, b) => a.persentase - b.persentase),
    [data],
  );

  const counts = useMemo(() => {
    const list = data?.indicators ?? [];
    return {
      good: list.filter((i) => i.persentase >= 100).length,
      mid: list.filter((i) => i.persentase >= 70 && i.persentase < 100).length,
      weak: list.filter((i) => i.persentase < 70).length,
    };
  }, [data]);

  const weakFacilities = useMemo(() => {
    const acc = new Map<
      string,
      {
        name: string;
        sum: number;
        n: number;
        lowest: {
          indicatorName: string;
          realisasi: number;
          target: number;
          persentase: number;
          satuan: string;
        }[];
      }
    >();

    (data?.indicators ?? []).forEach((i) =>
      i.ranking.forEach((r) => {
        if (!r.reported) return;
        const a = acc.get(r.faskesId) ?? {
          name: r.namaFaskes,
          sum: 0,
          n: 0,
          lowest: [],
        };
        a.sum += r.persentase;
        a.n += 1;
        a.lowest.push({
          indicatorName: i.nama,
          realisasi: r.realisasi,
          target: r.target,
          persentase: r.persentase,
          satuan: i.satuan ?? "",
        });
        acc.set(r.faskesId, a);
      }),
    );

    return [...acc.values()]
      .map((a) => ({
        name: a.name,
        value: a.n > 0 ? a.sum / a.n : 0,
        n: a.n,
        lowest: a.lowest.sort((x, y) => x.persentase - y.persentase).slice(0, 2),
      }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 5);
  }, [data]);

  const shown = showAll ? sorted : sorted.slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 14, paddingBottom: 32, gap: 14 }}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      {/* Header Profile & Title */}
      <View>
        <Text style={s.caption}>Selamat datang, {user?.name.split(" ")[0]}</Text>
        <Text accessibilityRole="header" style={s.title}>
          Kinerja Dinas Kesehatan
        </Text>
      </View>

      {/* Periode Filters */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Select
            compact
            label={`Triwulan (${year})`}
            value={quarter}
            onChange={setQuarter}
            items={[
              { label: "Per bulan", value: "" },
              ...[1, 2, 3, 4].map((n) => ({ label: `Triwulan ${n}`, value: String(n) })),
            ]}
          />
        </View>
        <View
          style={{ flex: 1, opacity: quarter ? 0.4 : 1 }}
          pointerEvents={quarter ? "none" : "auto"}
        >
          <Select
            compact
            label="Sampai bulan"
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            items={months.map((label, i) => ({ label, value: String(i + 1) }))}
          />
        </View>
      </View>

      {/* AI Agent ditunda sampai alur dan konfigurasi siap digunakan.
      <Button title="Tanya AI • Kinerja, target & realisasi" onPress={() => router.push({ pathname: "/ai-chat", params: { tahun: String(year), ...(quarter ? { triwulan: quarter } : { bulan: String(month) }) } })} />
      */}

      {query.isPending && <Loading />}
      {query.isError && (
        <>
          <Message error text={errorText(query.error)} />
          <Button secondary title="Coba lagi" onPress={() => void query.refetch()} />
        </>
      )}

      {data && (
        <>
          {/* Hero Card: Ringkasan Utama */}
          <View style={[s.hero, { backgroundColor: colors.primary }]}>
            <Text style={s.heroLabel}>Capaian kinerja keseluruhan</Text>
            <Text style={s.heroValue}>{format(data.summary.capaian)}%</Text>
            <Text style={s.heroSub}>
              {data.summary.indikator} indikator · {data.summary.faskes} faskes ·{" "}
              {quarter ? `Triwulan ${quarter}` : `s.d. ${months[month - 1]}`} {year}
            </Text>
          </View>

          {/* Status Trio Breakdown */}
          <View style={s.trio}>
            {[
              { n: counts.good, t: "Tercapai", sub: "≥ 100%", c: colors.primary },
              { n: counts.mid, t: "Cukup", sub: "70-99%", c: AMBER },
              { n: counts.weak, t: "Lemah", sub: "< 70%", c: colors.danger },
            ].map((x) => (
              <View key={x.t} style={[s.trioItem, { borderTopColor: x.c }]}>
                <Text style={[s.trioNum, { color: x.c }]}>{x.n}</Text>
                <Text style={s.trioText}>{x.t}</Text>
                <Text style={s.trioSub}>{x.sub}</Text>
              </View>
            ))}
          </View>

          {/* Realisasi Keuangan & Serapan Anggaran */}
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <Wallet size={18} color={colors.teal} />
              <Text accessibilityRole="header" style={s.section}>
                Realisasi Keuangan & Anggaran
              </Text>
            </View>

            <View style={s.financeGrid}>
              <View style={s.financeCol}>
                <Text style={s.financeLabel}>Realisasi Terverifikasi</Text>
                <Text style={[s.financeVal, { color: colors.teal }]}>
                  Rp {format(data.summary.realisasiKeuangan)}
                </Text>
              </View>
              <View style={s.financeDivider} />
              <View style={s.financeCol}>
                <Text style={s.financeLabel}>Pagu Anggaran (Target)</Text>
                <Text style={s.financeVal}>Rp {format(data.summary.targetKeuangan)}</Text>
              </View>
            </View>

            <View style={s.financeFoot}>
              <View style={s.spread}>
                <Text style={s.textMuted}>Persentase Serapan</Text>
                <Text style={[s.strong, { color: toneOf(data.summary.serapan) }]}>
                  {format(data.summary.serapan)}%
                </Text>
              </View>
              <View style={s.spread}>
                <Text style={s.textMuted}>Laporan Terverifikasi</Text>
                <Text style={s.strong}>
                  {data.summary.tervalidasi} / {data.summary.jumlahLaporan} laporan
                </Text>
              </View>
            </View>
          </View>

          {/* Indikator Terlemah */}
          <View style={s.card}>
            <View style={s.spread}>
              <Text accessibilityRole="header" style={s.section}>
                {showAll ? "Semua Indikator (Terlemah di Atas)" : "5 Indikator Terlemah"}
              </Text>
              <Text style={s.caption}>{sorted.length} total</Text>
            </View>

            {shown.length === 0 && <Message text="Belum ada data indikator." />}

            {shown.map((i) => (
              <IndicatorBar
                key={i.id}
                indicator={i}
                expanded={expandedId === i.id}
                onToggle={() => setExpandedId(expandedId === i.id ? null : i.id)}
              />
            ))}

            {sorted.length > 5 && (
              <Button
                secondary
                title={showAll ? "Tampilkan 5 terlemah saja" : `Lihat semua (${sorted.length})`}
                onPress={() => setShowAll(!showAll)}
              />
            )}
          </View>

          {/* 5 Faskes Terlemah */}
          <View style={s.card}>
            <Text accessibilityRole="header" style={s.section}>
              5 Faskes Terlemah
            </Text>
            <Text style={s.caption}>
              Fasilitas kesehatan dengan rata-rata persentase capaian terendah
            </Text>

            {weakFacilities.length === 0 && <Message text="Belum ada faskes yang melapor." />}

            {weakFacilities.map((f, index) => {
              const tone = toneOf(f.value);
              return (
                <View key={f.name} style={s.faskesCard}>
                  <View style={s.spread}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.barName}>
                        {index + 1}. {f.name}
                      </Text>
                      <Text style={s.caption}>Rata-rata dari {f.n} indikator yang dilaporkan</Text>
                    </View>
                    <View style={s.badgeWrap}>
                      <Text style={[s.barValue, { color: tone }]}>{format(f.value)}%</Text>
                      <View style={[s.pill, { backgroundColor: tone + "18" }]}>
                        <Text style={[s.pillText, { color: tone }]}>{labelOf(f.value)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={s.track}>
                    <View
                      style={[
                        s.fill,
                        {
                          width: `${Math.max(2, Math.min(100, f.value))}%`,
                          backgroundColor: tone,
                        },
                      ]}
                    />
                  </View>

                  {f.lowest.length > 0 && (
                    <View style={s.faskesLowestBox}>
                      <Text style={s.faskesLowestTitle}>Capaian Terendah:</Text>
                      {f.lowest.map((low, i) => (
                        <View key={i} style={s.faskesLowestItem}>
                          <Text style={s.faskesLowestName} numberOfLines={1}>
                            • {low.indicatorName}
                          </Text>
                          <Text style={s.faskesLowestNumbers}>
                            Realisasi: <Text style={s.bold}>{format(low.realisasi)}</Text> /
                            Target: <Text style={s.bold}>{format(low.target)}</Text> {low.satuan}{" "}
                            (<Text style={{ color: toneOf(low.persentase), fontWeight: "700" }}>
                              {format(low.persentase)}%
                            </Text>)
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={s.captionCenter}>
            Hijau ≥ 100% · Kuning 70–99% · Merah &lt; 70%
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  spread: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: colors.text },
  caption: { fontSize: 12, lineHeight: 17, color: colors.muted },
  captionCenter: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 4 },
  textMuted: { fontSize: 13, color: colors.muted },
  strong: { fontSize: 13, fontWeight: "700", color: colors.text },
  bold: { fontWeight: "700", color: colors.text },

  hero: { borderRadius: 16, padding: 18, gap: 4 },
  heroLabel: { fontSize: 12, color: colors.mint, fontWeight: "600" },
  heroValue: { fontSize: 44, lineHeight: 52, fontWeight: "800", color: colors.white },
  heroSub: { fontSize: 11, color: colors.mint, opacity: 0.9 },

  trio: { flexDirection: "row", gap: 8 },
  trioItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 4,
    padding: 10,
    alignItems: "center",
  },
  trioNum: { fontSize: 24, lineHeight: 30, fontWeight: "800" },
  trioText: { fontSize: 12, fontWeight: "700", color: colors.text },
  trioSub: { fontSize: 10, color: colors.muted, marginTop: 2 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text },

  financeGrid: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeCol: { flex: 1, gap: 3 },
  financeDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  financeLabel: { fontSize: 11, color: colors.muted, fontWeight: "500" },
  financeVal: { fontSize: 14, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  financeFoot: { gap: 6, paddingTop: 4 },

  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  barName: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "700", color: colors.text },
  badgeWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  barValue: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: "800" },

  track: { height: 9, borderRadius: 5, backgroundColor: "#E2E8F0", overflow: "hidden" },
  fill: { height: 9, borderRadius: 5 },

  numRow: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  numItem: { flex: 1, alignItems: "center" },
  numDivider: { width: 1, height: 22, backgroundColor: colors.border },
  numLabel: { fontSize: 10, color: colors.muted },
  numValue: { fontSize: 12, fontWeight: "700", color: colors.text, marginTop: 1 },

  toggleHint: { fontSize: 11, color: colors.teal, fontWeight: "600" },

  expandedBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  expandedTitle: { fontSize: 11, fontWeight: "700", color: colors.text },
  weakFaskesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weakFaskesName: { fontSize: 12, fontWeight: "600", color: colors.text },
  weakFaskesNumbers: { fontSize: 11, color: colors.muted, marginTop: 1 },
  weakFaskesPercent: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },

  faskesCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  faskesLowestBox: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  faskesLowestTitle: { fontSize: 11, fontWeight: "700", color: colors.danger },
  faskesLowestItem: { gap: 1 },
  faskesLowestName: { fontSize: 11, fontWeight: "600", color: colors.text },
  faskesLowestNumbers: { fontSize: 11, color: colors.muted },
});
