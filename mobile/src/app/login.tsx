import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../core/session";
import { errorText } from "../core/api";
import { Icon, Button, Field, Message } from "../components/ui";
import { colors as c } from "../core/theme";

export default function Login() {
  const { login } = useSession();
  const { height } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const compact = keyboardOpen || height < 650;
  const outerSpaces = password !== password.trim();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  async function submit() {
    if (busy || !identifier.trim() || !password) return;
    Keyboard.dismiss();
    setBusy(true);
    setError("");
    try {
      await login(identifier, password);
      setPassword("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={require("../../assets/foto-kantor.webp")} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(244,251,248,0.94)" }]} />
        <View style={s.orbTop} /><View style={s.orbBottom} />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={s.keyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[s.content, compact && { gap: 8, paddingVertical: 4 }]}>
            {!keyboardOpen && <View style={{ alignItems: "center", gap: 6 }}>
              <Image source={require("../../assets/logo-gass.webp")} contentFit="contain" style={{ width: compact ? 130 : 180, height: compact ? 95 : 135 }} accessibilityLabel="Logo GASS" />
              <Text style={s.agency}>DINAS KESEHATAN</Text>
              <Text style={s.caption}>Kabupaten Konawe Selatan</Text>
            </View>}
            <View style={[s.form, compact && { padding: 14, gap: 10 }]}>
              <View style={{ gap: 3 }}>
                <Text accessibilityRole="header" style={s.title}>Masuk ke GASS</Text>
                {!keyboardOpen && <Text style={s.caption}>Pelayanan dekat. Data akurat.</Text>}
              </View>
              <Field label="Username / NIP" value={identifier} onChangeText={(v) => { setIdentifier(v); setError(""); }} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="username" maxLength={100} placeholder="Masukkan username atau NIP" editable={!busy} />
              <Field label="Kata sandi" value={password} onChangeText={(v) => { setPassword(v); setError(""); }} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="current-password" textContentType="password" maxLength={200} placeholder="Masukkan kata sandi" editable={!busy} returnKeyType="go" onSubmitEditing={() => void submit()}
                rightAccessory={<Pressable accessibilityRole="button" accessibilityLabel={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onPress={() => setVisible(!visible)} style={s.eye}><Icon name={visible ? "eyeOff" : "eye"} size={19} /></Pressable>} />
              {outerSpaces && <View style={s.warning}>
                <Text style={s.warningText}>Ada spasi di awal/akhir kata sandi.</Text>
                <Pressable accessibilityRole="button" onPress={() => { setPassword(password.trim()); setError(""); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={[s.warningText, { fontWeight: "700", textDecorationLine: "underline" }]}>Hapus spasi tambahan</Text></Pressable>
              </View>}
              {!!error && <Message error text={error} />}
              <Button title={busy ? "Memeriksa akun…" : "Masuk ke GASS"} onPress={() => void submit()} disabled={busy || !identifier.trim() || !password} />
            </View>
            {!compact && (
              <View style={s.footerContainer}>
                <View style={s.footer}>
                  <Icon name="shield" size={14} />
                  <Text style={s.caption}>Akses sesuai kewenangan akun Anda</Text>
                </View>
                <Image
                  source={require("../../assets/kemenkes_logo.webp")}
                  contentFit="contain"
                  style={{ width: 130, height: 48 }}
                  accessibilityLabel="Kementerian Kesehatan Republik Indonesia"
                />
                <View style={{ alignItems: "center", gap: 1 }}>
                  <Text style={s.versionText}>Versi {appVersion}</Text>
                  <Text style={s.versionSub}>Dinas Kesehatan 2026</Text>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  keyboard: { flex: 1, justifyContent: "center" },
  content: { width: "100%", maxWidth: 420, alignSelf: "center", paddingHorizontal: 22, paddingVertical: 12, gap: 14 },
  form: { padding: 20, borderRadius: 20, gap: 14, backgroundColor: c.white, borderWidth: 1, borderColor: c.border },
  title: { fontSize: 21, lineHeight: 27, fontWeight: "700", color: c.text, textAlign: "center" },
  caption: { color: c.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  agency: { color: c.primary, fontSize: 11, letterSpacing: 1.4, fontWeight: "700" },
  footerContainer: { alignItems: "center", gap: 8, marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  versionText: { fontSize: 11, fontWeight: "600", color: c.teal },
  versionSub: { fontSize: 10, color: c.muted },
  eye: { width: "100%", height: "100%", minHeight: 44, alignItems: "center", justifyContent: "center" },
  warning: { backgroundColor: "#FFF4D6", borderRadius: 8, paddingHorizontal: 10, paddingTop: 6 },
  warningText: { fontSize: 11, lineHeight: 16, color: "#805500" },
  orbTop: { position: "absolute", width: 300, height: 300, borderRadius: 150, right: -160, top: -100, backgroundColor: "#D1FAE5", opacity: 0.8 },
  orbBottom: { position: "absolute", width: 260, height: 260, borderRadius: 130, left: -170, bottom: -65, borderWidth: 36, borderColor: "#0F766E", opacity: 0.08 },
});
