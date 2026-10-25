import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Building2, LogOut, type LucideIcon } from "lucide-react-native";
import { useSession } from "../../core/session";
import { errorText } from "../../core/api";
import { Badge } from "../../components/ui";
import { colors as c } from "../../core/theme";

const roleNames = {
  ADMIN_DINKES: "Admin Dinas Kesehatan",
  AKUN_BIDANG: "Admin Bidang",
  OPERATOR_PUSKESMAS: "Operator Puskesmas",
  KEPALA_DINAS: "Kepala Dinas",
};
function InfoRow({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <View style={s.infoRow}>
    <View style={s.icon}><Icon size={18} color={c.teal} /></View>
    <View style={{ flex: 1, gap: 3 }}><Text style={s.label}>{title}</Text><Text style={s.detail}>{detail}</Text></View>
  </View>;
}
export default function Account() {
  const { user, logout } = useSession();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  function confirmLogout() {
    Alert.alert("Keluar dari GASS?", "Draf yang belum terkirim akan dihapus dari perangkat.", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar & hapus draf", style: "destructive", onPress: () => {
        setBusy(true);
        void logout().catch((e) => Alert.alert("Belum dapat keluar", errorText(e))).finally(() => setBusy(false));
      } },
    ]);
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <View style={{ gap: 4 }}><Text accessibilityRole="header" style={s.title}>Profil saya</Text><Text style={s.detail}>Informasi akun Anda.</Text></View>
      <View style={s.card}>
        <View style={s.identity}>
          <View style={s.avatar}><Text style={s.initials}>{user.name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase()}</Text></View>
          <View style={{ flex: 1, gap: 7 }}><Text style={s.name}>{user.name}</Text><Badge text={roleNames[user.role]} /></View>
        </View>
        <View style={s.divider} />
        <InfoRow icon={Building2} title="Instansi / unit kerja" detail={user.faskes?.namaFaskes ?? "Dinas Kesehatan Kabupaten Konawe Selatan"} />
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmLogout} style={({ pressed }) => [s.logout, (pressed || busy) && { opacity: 0.5 }]}>
        <LogOut size={18} color={c.danger} /><Text style={{ color: c.danger, fontSize: 14, fontWeight: "600" }}>{busy ? "Mengakhiri sesi…" : "Keluar akun"}</Text>
      </Pressable>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 14, paddingBottom: 24, gap: 10, width: "100%", maxWidth: 600, alignSelf: "center" },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: c.text, letterSpacing: -0.5 },
  detail: { fontSize: 12, lineHeight: 18, color: c.muted },
  card: { padding: 12, gap: 10, borderRadius: 14, backgroundColor: c.white, borderWidth: 1, borderColor: c.border },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: c.mint },
  initials: { fontSize: 18, fontWeight: "700", color: c.primary },
  name: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: c.text },
  divider: { height: 1, backgroundColor: c.border },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.text },
  logout: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#F3D4D1", backgroundColor: c.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
