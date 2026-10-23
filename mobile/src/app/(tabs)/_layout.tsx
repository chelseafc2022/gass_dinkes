import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSession } from "../../core/session";
import { allowed, canWrite, canVerify } from "../../core/domain";
import { colors } from "../../core/theme";
export default function TabsLayout() {
  const { user } = useSession();
  if (!user) return null;
  const reports =
    allowed(user, "capaian_kinerja") || allowed(user, "capaian_keuangan");
  return (
    <Tabs
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.white },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white },
        lazy: true,
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>●</Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ringkasan",
          href: allowed(user, "dashboard") ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: "Laporan", href: reports ? undefined : null }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          title: "Verifikasi",
          href: reports && canVerify(user) ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="drafts"
        options={{
          title: "Draf",
          href: reports && canWrite(user) ? undefined : null,
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Akun" }} />
    </Tabs>
  );
}
