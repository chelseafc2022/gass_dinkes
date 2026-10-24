import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../core/session";
import { errorText } from "../core/api";
import {
  Badge,
  Icon,
  Button,
  Card,
  Field,
  Heading,
  Message,
  Page,
  styles,
} from "../components/ui";
import { colors } from "../core/theme";
export default function Login() {
  const { login } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await login(identifier, password);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Page>
          <View
            style={[
              styles.row,
              { justifyContent: "space-between", marginTop: 24 },
            ]}
          >
            <Image
              source={require("../../assets/logo-gass.webp")}
              style={{ width: 170, height: 90 }}
              contentFit="contain"
              accessibilityLabel="Logo GASS"
            />
            <Image
              source={require("../../assets/logo-konsel.webp")}
              style={{ width: 55, height: 70 }}
              contentFit="contain"
              accessibilityLabel="Lambang Kabupaten Konawe Selatan"
            />
          </View>
          <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: colors.primary }}>
            <Image source={require("../../assets/foto-kantor.webp")} contentFit="cover" style={{ width: "100%", height: 130 }} accessibilityLabel="Kantor Dinas Kesehatan Kabupaten Konawe Selatan" />
            <View style={{ padding: 22, gap: 10 }}>
              <Text style={{ color: colors.mint, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>GERAK AKSI SEHAT SETARA</Text>
              <Text style={{ color: colors.white, fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8 }}>Pelayanan dekat.
Data akurat.</Text>
              {/* <Text style={{ color: colors.mint, fontSize: 13, lineHeight: 20 }}>Dari lapangan hingga keputusan.
Bersama untuk Konawe Selatan yang sehat.</Text> */}
            </View>
          </View>
          <Card>
            {/* <Badge text="GASS • MOBILE" /> */}
            <Heading
              title="Selamat datang"
              subtitle="Masuk dengan akun Anda yang sudah terdaftar di GASS."
            />
            <Field
              label="Username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              maxLength={100}
            />
            <Field
              label="Kata sandi"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoComplete="current-password"
              maxLength={200}
              onSubmitEditing={() => {
                if (identifier.trim() && password && !busy) void submit();
              }}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onPress={() => setVisible(!visible)}
                  hitSlop={8}
                  style={{ minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name={visible ? "eyeOff" : "eye"} size={20} color={colors.teal} />
                </Pressable>
              }
            />
            {!!error && <Message error text={error} />}
            <Button
              title={busy ? "Memeriksa akun…" : "Masuk ke GASS"}
              onPress={() => void submit()}
              disabled={busy || !identifier.trim() || !password}
            />
          </Card>
          <View style={{ alignItems: "center", gap: 10, paddingBottom: 16 }}>
            <View style={styles.row}><Icon name="shield" size={16} /><Text style={styles.muted}>Akses sesuai kewenangan akun Anda</Text></View>
            <Image source={require("../../assets/kemenkes_logo.webp")} contentFit="contain" style={{ width: 110, height: 46 }} accessibilityLabel="Kementerian Kesehatan" />
            <View style={{ alignItems: "center", gap: 2, marginTop: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.teal }}>Versi 1.0.0</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>Dinas Kesehatan 2026</Text>
            </View>
          </View>
        </Page>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
