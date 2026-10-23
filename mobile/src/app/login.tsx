import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../core/session";
import { errorText } from "../core/api";
import {
  Button,
  Card,
  Field,
  Heading,
  Message,
  Page,
  styles,
} from "../components/ui";
export default function Login() {
  const { login } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
          <Text style={styles.badge}>DINAS KESEHATAN • KONAWE SELATAN</Text>
          <Heading
            title={"Pelayanan dekat.\nData akurat."}
            subtitle="Gerak Aksi Sehat Setara, kini dalam genggaman."
          />
          <Card>
            <Heading
              title="Selamat datang"
              subtitle="Masuk dengan akun eGov/Simpeg yang sudah mendapat akses GASS."
            />
            <Field
              label="NIP, username, atau email"
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
              secureTextEntry
              autoComplete="current-password"
              maxLength={200}
              onSubmitEditing={() => {
                if (identifier.trim() && password && !busy) void submit();
              }}
            />
            {!!error && <Message error text={error} />}
            <Button
              title={busy ? "Memeriksa akun…" : "Masuk ke GASS"}
              onPress={() => void submit()}
              disabled={busy || !identifier.trim() || !password}
            />
          </Card>
          <Text style={styles.muted}>
            Input lapangan, verifikasi bulanan, dan pemantauan kinerja sesuai
            kewenangan akun Anda.
          </Text>
        </Page>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
