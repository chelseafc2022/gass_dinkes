import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Building2, ChevronDown, ChevronUp, Database, Info, LogOut, ShieldCheck, Wifi, type LucideIcon } from "lucide-react-native";
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
  const [privacyOpen, setPrivacyOpen] = useState(false);
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
      <View style={{ gap: 4 }}><Text accessibilityRole="header" style={s.title}>Profil saya</Text><Text style={s.detail}>Identitas dan pengaturan akses Anda.</Text></View>
      <View style={s.card}>
        <View style={s.identity}>
          <View style={s.avatar}><Text style={s.initials}>{user.name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase()}</Text></View>
          <View style={{ flex: 1, gap: 7 }}><Text style={s.name}>{user.name}</Text><Badge text={roleNames[user.role]} /></View>
        </View>
        <View style={s.divider} />
        <InfoRow icon={Building2} title="Instansi / unit kerja" detail={user.faskes?.namaFaskes ?? "Dinas Kesehatan Kabupaten Konawe Selatan"} />
        <InfoRow icon={ShieldCheck} title="Hak akses" detail="Menu dan tindakan mengikuti kewenangan akun Anda." />
      </View>
      <Text accessibilityRole="header" style={s.section}>Keamanan & penyimpanan</Text>
      <View style={s.card}>
        <InfoRow icon={Database} title="Draf di perangkat" detail="Maksimal 30 laporan · tersimpan hingga 7 hari" />
        <View style={s.divider} />
        <InfoRow icon={Wifi} title="Koneksi internet" detail="Diperlukan untuk masuk, mengirim, verifikasi, dan keluar akun." />
        <View style={s.divider} />
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: privacyOpen }} onPress={() => setPrivacyOpen(!privacyOpen)} style={({ pressed }) => [s.disclosure, pressed && { opacity: 0.65 }]}>
          <View style={s.icon}><ShieldCheck size={18} color={c.teal} /></View>
          <Text style={[s.label, { flex: 1 }]}>Privasi data</Text>
          {privacyOpen ? <ChevronUp size={18} color={c.muted} /> : <ChevronDown size={18} color={c.muted} />}
        </Pressable>
        {privacyOpen && <Text style={s.privacy}>Draf dienkripsi di perangkat. Cache laporan hanya berada di memori. Keluar akun akan menghapus draf akun ini dari perangkat.</Text>}
      </View>
      <Text accessibilityRole="header" style={s.section}>Informasi aplikasi</Text>
      <View style={s.card}>
        <InfoRow icon={Info} title="Versi aplikasi" detail="1.0.0" />
        <View style={s.divider} />
        <InfoRow icon={Building2} title="Instansi / Tahun" detail="Dinas Kesehatan 2026" />
      </View>
      <View style={s.notice}><Info size={16} color={c.muted} /><Text style={[s.detail, { flex: 1 }]}>Pastikan semua draf sudah terkirim sebelum keluar.</Text></View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmLogout} style={({ pressed }) => [s.logout, (pressed || busy) && { opacity: 0.5 }]}>
        <LogOut size={18} color={c.danger} /><Text style={{ color: c.danger, fontSize: 14, fontWeight: "600" }}>{busy ? "Mengakhiri sesi…" : "Keluar akun"}</Text>
      </Pressable>
      <View style={s.footerWrap}>
        <Text style={s.footer}>GASS · Gerak Aksi Sehat Setara</Text>
        <Text style={s.footerSub}>Versi 1.0.0 · Dinas Kesehatan 2026</Text>
      </View>
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
  section: { fontSize: 13, fontWeight: "700", color: c.text, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, lineHeight: 19, fontWeight: "600", color: c.text },
  disclosure: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  privacy: { fontSize: 12, lineHeight: 19, color: c.muted, padding: 12, borderRadius: 10, backgroundColor: c.soft },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  logout: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#F3D4D1", backgroundColor: c.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerWrap: { alignItems: "center", gap: 3, paddingTop: 4, paddingBottom: 10 },
  footer: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: c.teal, textAlign: "center" },
  footerSub: { fontSize: 11, lineHeight: 16, color: c.muted, textAlign: "center" },
});
