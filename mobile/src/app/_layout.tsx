import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { usePreventScreenCapture } from "expo-screen-capture";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "../core/query";
import { SessionProvider, useSession } from "../core/session";
import { Loading } from "../components/ui";
import { colors } from "../core/theme";
export { ErrorBoundary } from "expo-router";
function Routes() {
  const { user, loading } = useSession();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [online, setOnline] = useState(true);
  usePreventScreenCapture();
  useEffect(() => {
    const app = AppState.addEventListener("change", (s) => {
      setActive(s === "active");
      focusManager.setFocused(s === "active");
    });
    const memory = AppState.addEventListener("memoryWarning", () =>
      queryClient.removeQueries({ type: "inactive" }),
    );
    let updated = false;
    const update = (s: Network.NetworkState) => {
      const connected =
        s.isConnected !== false && s.isInternetReachable !== false;
      setOnline(connected);
      onlineManager.setOnline(connected);
    };
    const network = Network.addNetworkStateListener((s) => {
      updated = true;
      update(s);
    });
    void Network.getNetworkStateAsync()
      .then((s) => {
        if (!updated) update(s);
      })
      .catch(() => {});
    return () => {
      app.remove();
      memory.remove();
      network.remove();
    };
  }, []);
  if (loading) return <Loading />;
  return (
    <View style={{ flex: 1 }}>
      {!online && (
        <Text
          style={{
            padding: 12,
            backgroundColor: colors.mint,
            color: colors.text,
          }}
        >
          Offline • simpan input sebagai draf. Pengiriman memerlukan koneksi.
        </Text>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="report"
            options={{
              headerShown: true,
              title: "Input laporan",
              headerTintColor: colors.primary,
            }}
          />
        </Stack.Protected>
      </Stack>
      {!active && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Text
            style={{ color: colors.primary, fontSize: 32, fontWeight: "800" }}
          >
            GASS
          </Text>
        </View>
      )}
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Routes />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
