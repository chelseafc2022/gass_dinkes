import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, onlineManager } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { api, ApiError, errorText } from "../../core/api";
import { useSession } from "../../core/session";
import { allowed, currentPeriod, format } from "../../core/domain";
import { colors } from "../../core/theme";
import {
  Button,
  Card,
  Field,
  Loading,
  Message,
  Page,
  styles,
} from "../../components/ui";
import {
  answerSchema,
  contextLabel,
  initialContext,
  responseSchema,
} from "./contract";
import type { Answer, Context } from "./contract";

type Turn = { id: number; question: string; result: Answer };
const suggestions = [
  "Bagaimana kinerja pada periode ini?",
  "Berapa realisasi anggaran pada periode ini?",
  "Puskesmas mana yang perlu ditindaklanjuti?",
];
function failure(error: unknown) {
  if (error instanceof ApiError && error.status === 503)
    return "Layanan AI belum tersedia. Dashboard tetap dapat digunakan.";
  if (error instanceof ApiError && error.status === 429)
    return "Batas penggunaan AI tercapai. Coba lagi nanti atau gunakan dashboard.";
  return errorText(error);
}

function Facts({ result }: { result: Answer }) {
  return (
    <>
      <Text selectable style={styles.text}>
        {result.answer}
      </Text>
      {result.facts.map((fact, index) => (
        <View key={`${fact.id}-${index}`} style={s.fact}>
          <Text style={styles.h2}>{fact.label}</Text>
          <Text style={styles.muted}>{fact.period}</Text>
          <Text style={s.value}>
            {format(fact.realization)}{" "}
            <Text style={styles.text}>{fact.unit}</Text>
          </Text>
          <Text style={styles.text}>
            Target tahunan: {format(fact.target)} {fact.unit}
          </Text>
          <Text style={styles.text}>
            Capaian:{" "}
            {fact.percentage === null
              ? "Belum dapat dihitung"
              : `${format(fact.percentage)}%`}
          </Text>
          <Text style={styles.text}>
            Selisih target − realisasi: {format(fact.gap)} {fact.unit}
          </Text>
          <Text style={styles.badge}>{fact.status.replaceAll("_", " ")}</Text>
          <Text style={styles.muted}>
            Bulan-laporan: {fact.submitted}/{fact.expected} dikirim ·{" "}
            {fact.verified}/{fact.expected} terverifikasi. Hitungan berdasarkan
            baris laporan yang tersedia.
          </Text>
        </View>
      ))}
      {result.warnings.map((warning) => (
        <Text key={warning} style={styles.muted}>
          • {warning}
        </Text>
      ))}
      <Text style={styles.muted}>
        Diambil:{" "}
        {new Date(result.retrievedAt).toLocaleString("id-ID", {
          timeZone: "Asia/Makassar",
        })}{" "}
        WITA
      </Text>
    </>
  );
}

function Conversation({ initial }: { initial: Context }) {
  const { user } = useSession();
  const [context, setContext] = useState(initial);
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Answer | null>(null);
  const pending = useRef<AbortController | null>(null);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const availability = useQuery({
    queryKey: ["ai-status", user?.id],
    queryFn: ({ signal }) =>
      api<{ enabled: boolean }>("/ai/status", { signal }),
    retry: false,
    staleTime: 0,
  });
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );

  function cancel() {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
  }
  async function send(question = message) {
    if (pending.current || !question.trim()) return;
    if (!onlineManager.isOnline()) {
      setError("Chat AI memerlukan koneksi internet.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setSource(null);
    try {
      const result = responseSchema.parse(
        await api("/ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: question.trim(), context }),
          signal: controller.signal,
        }),
      );
      if (pending.current !== controller) return;
      if (!result.enabled) {
        setError(result.message);
        void availability.refetch();
        return;
      }
      setTurns((previous) => [
        ...previous.slice(-9),
        { id: Date.now(), question: question.trim(), result },
      ]);
      setContext(result.resolvedContext);
      setMessage("");
    } catch (e) {
      if (pending.current === controller) setError(failure(e));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  async function showSource(result: Answer) {
    if (!result.source || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setSource(null);
    try {
      const fresh = answerSchema.parse(
        await api("/ai/facts", {
          method: "POST",
          body: JSON.stringify(result.source.plan),
          signal: controller.signal,
        }),
      );
      if (pending.current === controller) setSource(fresh);
    } catch (e) {
      if (pending.current === controller) setError(failure(e));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <Page
          ref={scroll}
          automaticallyAdjustKeyboardInsets={false}
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: true })
          }
        >
          <Card>
            <View style={styles.row}>
              <Sparkles color={colors.teal} size={22} />
              <Text style={styles.title}>Tanya GASS</Text>
            </View>
            <Text style={styles.text}>
              Tanyakan kinerja, target, dan realisasi. Jawaban menggunakan
              laporan terverifikasi.
            </Text>
            <Text style={styles.muted}>
              Pertanyaan diproses layanan AI eksternal. Hindari data pasien dan
              informasi pribadi. Riwayat layar ini tidak disimpan permanen.
            </Text>
            <Text style={styles.badge}>KONTEKS AKTIF</Text>
            <Text style={styles.text}>{contextLabel(context)}</Text>
            <Text style={styles.muted}>
              Sebutkan periode atau nama indikator untuk mengubah konteks.
            </Text>
          </Card>
          {availability.isPending && <Loading />}
          {availability.isError && (
            <>
              <Message error text={failure(availability.error)} />
              <Button
                secondary
                title="Periksa layanan lagi"
                onPress={() => void availability.refetch()}
              />
            </>
          )}
          {availability.data?.enabled === false && (
            <>
              <Message text="AI belum diaktifkan oleh pengelola. Konfigurasi layanan diperlukan di server." />
              <Button
                secondary
                title="Periksa layanan lagi"
                onPress={() => void availability.refetch()}
              />
            </>
          )}
          {!turns.length &&
            availability.data?.enabled &&
            suggestions.map((question) => (
              <Button
                key={question}
                secondary
                title={question}
                disabled={busy}
                onPress={() => void send(question)}
              />
            ))}
          {turns.map((turn) => (
            <View key={turn.id} style={{ gap: 10 }}>
              <View style={s.question}>
                <Text
                  selectable
                  style={{ color: colors.white, lineHeight: 22 }}
                >
                  {turn.question}
                </Text>
              </View>
              <Card>
                <Text style={styles.badge}>GASS • DATA TERVERIFIKASI</Text>
                <Facts result={turn.result} />
                {turn.result.source && (
                  <Button
                    secondary
                    title="Lihat sumber data terbaru"
                    disabled={busy}
                    onPress={() => void showSource(turn.result)}
                  />
                )}
              </Card>
            </View>
          ))}
          {source && (
            <Card>
              <Text style={styles.title}>Sumber data GASS</Text>
              <Text style={styles.muted}>
                Dibaca ulang dari backend tanpa memanggil model AI. Nilai dapat
                berubah setelah laporan diperbarui.
              </Text>
              <Facts result={source} />
              <Button
                secondary
                title="Tutup sumber"
                onPress={() => setSource(null)}
              />
            </Card>
          )}
          {!!error && <Message error text={error} />}
          {busy && (
            <>
              <Loading />
              <Button secondary title="Batalkan menunggu" onPress={cancel} />
            </>
          )}
          {turns.length > 0 && (
            <Button
              secondary
              title="Percakapan baru"
              disabled={busy}
              onPress={() => {
                setTurns([]);
                setContext(initial);
                setSource(null);
                setMessage("");
                setError("");
              }}
            />
          )}
        </Page>
        <View style={s.composer}>
          <Field
            label="Pertanyaan Anda"
            value={message}
            onChangeText={setMessage}
            placeholder="Contoh: berapa realisasi sampai September?"
            multiline
            maxLength={2000}
            editable={!busy}
            style={{ maxHeight: 120 }}
          />
          <Button
            title={busy ? "Mengambil data…" : "Kirim pertanyaan"}
            disabled={busy || !message.trim() || !availability.data?.enabled}
            onPress={() => void send()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AiChat() {
  const { user } = useSession();
  const params = useLocalSearchParams<{
    tahun?: string;
    bulan?: string;
    triwulan?: string;
  }>();
  const now = currentPeriod();
  let initial: Context;
  try {
    initial = initialContext(
      Number(params.tahun ?? now.year),
      Number(params.bulan ?? now.month),
      params.triwulan ? Number(params.triwulan) : null,
    );
  } catch {
    initial = initialContext(now.year, now.month, null);
  }
  if (!user || user.role !== "KEPALA_DINAS" || !allowed(user, "dashboard"))
    return (
      <Page>
        <Message
          error
          text="Chat AI khusus Kepala Dinas dengan akses dashboard."
        />
      </Page>
    );
  return <Conversation key={user.id} initial={initial} />;
}

const s = StyleSheet.create({
  question: {
    alignSelf: "flex-end",
    maxWidth: "94%",
    padding: 14,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
  },
  fact: {
    padding: 12,
    borderRadius: 12,
    gap: 5,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
  },
  value: { fontSize: 24, fontWeight: "800", color: colors.primary },
  composer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
});
