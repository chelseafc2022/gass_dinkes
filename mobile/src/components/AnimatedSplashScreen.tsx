import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "../core/theme";

export function AnimatedSplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.88));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [textFade] = useState(() => new Animated.Value(0));
  const [barAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 1. Entrance animation: Logo scale & fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Text fade in
      Animated.timing(textFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // 3. Gentle breathing loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    });

    // 4. Progress bar animation
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.quad),
    }).start();
  }, [fadeAnim, scaleAnim, pulseAnim, textFade, barAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["15%", "100%"],
  });

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Memuat aplikasi GASS"
    >
      {/* Decorative ambient glowing rings */}
      <View style={styles.glowRingOuter} />
      <View style={styles.glowRingInner} />

      <View style={styles.content}>
        {/* Animated Emblem */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
          }}
        >
          <Image
            source={require("../../assets/logo-gass.webp")}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Logo GASS — Gerak Aksi Sehat Setara"
          />
        </Animated.View>

        {/* Brand Information */}
        <Animated.View style={[styles.textBlock, { opacity: textFade }]}>
          <Text style={styles.tagline}>GERAK AKSI SEHAT SETARA</Text>
          <Text style={styles.institution}>
            Dinas Kesehatan Kabupaten Konawe Selatan
          </Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Versi 1.0.0 • 2026</Text>
          </View>
        </Animated.View>

        {/* Modern Progress Bar */}
        <Animated.View style={[styles.progressWrapper, { opacity: textFade }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: barWidth }]} />
          </View>
          <Text style={styles.loadingNote}>Menyiapkan layanan kesehatan…</Text>
        </Animated.View>
      </View>

      {/* Footer Government Attribution */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pemerintah Kabupaten Konawe Selatan
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  glowRingOuter: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: colors.teal,
    opacity: 0.18,
  },
  glowRingInner: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.mint,
    opacity: 0.12,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  logo: {
    width: 230,
    height: 210,
    marginBottom: 20,
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  tagline: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.2,
    textAlign: "center",
  },
  institution: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 290,
    lineHeight: 22,
  },
  versionBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(15, 118, 110, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(209, 250, 229, 0.25)",
  },
  versionText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  progressWrapper: {
    marginTop: 36,
    alignItems: "center",
    width: 200,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(209, 250, 229, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.mint,
    borderRadius: 4,
  },
  loadingNote: {
    marginTop: 10,
    fontSize: 11,
    color: "rgba(209, 250, 229, 0.75)",
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 34,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(209, 250, 229, 0.6)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
});
