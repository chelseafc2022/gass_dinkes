import { Tabs } from "expo-router";
import { View } from "react-native";
import { BrandHeader, Icon } from "../../components/ui";
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
      screenOptions={({ route }) => ({
        headerTintColor: colors.primary,
        headerTitle: () => <BrandHeader />,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerStyle: { backgroundColor: colors.white },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        lazy: true,
        tabBarIcon: ({ color, focused }) => (
          <View style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 3, backgroundColor: focused ? colors.mint : "transparent" }}>
            <Icon name={route.name === "index" ? "home" : route.name === "verify" ? "shield" : route.name === "drafts" ? "draft" : route.name === "account" ? "user" : "report"} color={typeof color === "string" ? color : colors.primary} />
          </View>
        ),
      })}
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
