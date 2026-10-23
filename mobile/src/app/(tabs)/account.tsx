import { useState } from "react";
import { Alert, Text } from "react-native";
import { useSession } from "../../core/session";
import { errorText } from "../../core/api";
import { Page, Heading, Card, Button, styles } from "../../components/ui";
export default function Account() {
  const { user, logout } = useSession();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <Page>
      <Heading title="Akun Anda" />
      <Card>
        <Text style={styles.h2}>{user.name}</Text>
        <Text style={styles.text}>{user.role.replaceAll("_", " ")}</Text>
        <Text style={styles.muted}>
          {user.faskes?.namaFaskes ??
            "Dinas Kesehatan Kabupaten Konawe Selatan"}
        </Text>
      </Card>
      <Card>
        <Text style={styles.h2}>Penyimpanan & privasi</Text>
        <Text style={styles.text}>
          Draf terenkripsi di perangkat, maksimal 30 laporan dan disimpan selama
          7 hari. Cache laporan hanya berada di memori. Keluar akun akan
          menghapus draf akun ini.
        </Text>
        <Text style={styles.muted}>
          Koneksi internet diperlukan untuk masuk, mengirim, verifikasi, dan
          keluar akun.
        </Text>
      </Card>
      <Button
        title={busy ? "Mengakhiri sesi…" : "Keluar akun"}
        disabled={busy}
        onPress={() =>
          Alert.alert(
            "Keluar dari GASS?",
            "Draf yang belum terkirim akan dihapus dari perangkat.",
            [
              { text: "Batal", style: "cancel" },
              {
                text: "Keluar & hapus draf",
                style: "destructive",
                onPress: () => {
                  setBusy(true);
                  void logout()
                    .catch((e) =>
                      Alert.alert("Belum dapat keluar", errorText(e)),
                    )
                    .finally(() => setBusy(false));
                },
              },
            ],
          )
        }
      />
    </Page>
  );
}
