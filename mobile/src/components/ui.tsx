import { House, FileText, Check, FilePenLine, UserRound, ShieldCheck, ArrowRight, SlidersHorizontal, Eye, EyeOff } from "lucide-react-native";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Image } from "expo-image";
import { Picker } from "@react-native-picker/picker";
import { colors as c } from "../core/theme";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 20,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  card: {
    backgroundColor: c.white,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12,
  },
  title: { fontSize: 28, lineHeight: 35, letterSpacing: -0.8, fontWeight: "800", color: c.text },
  h2: { fontSize: 18, lineHeight: 25, fontWeight: "700", color: c.text },
  text: { fontSize: 15, lineHeight: 22, color: c.text },
  muted: { fontSize: 13, lineHeight: 20, color: c.muted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 50,
    color: c.text,
    backgroundColor: c.white,
    fontSize: 16,
  },
  badge: { color: c.teal, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  error: { color: c.danger, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 52,
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: c.white, fontSize: 15, fontWeight: "700" },
});
export function Page({ children }: PropsWithChildren) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={{ width: 28, height: 3, borderRadius: 3, backgroundColor: c.accent, marginBottom: 5 }} />
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && { backgroundColor: c.mint },
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: c.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, style, rightAccessory, ...props }: TextInputProps & { label: string; rightAccessory?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          selectionColor={c.teal}
          style={[styles.input, focused && { borderColor: c.teal, backgroundColor: c.soft }, rightAccessory ? { paddingRight: 48 } : undefined, style]}
        />
        {rightAccessory && (
          <View style={{ position: "absolute", right: 12, height: "100%", justifyContent: "center", alignItems: "center" }}>
            {rightAccessory}
          </View>
        )}
      </View>
    </View>
  );
}
export function Select({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 12,
          backgroundColor: c.white,
        }}
      >
        <Picker
          accessibilityLabel={label}
          selectedValue={value}
          onValueChange={onChange}
          dropdownIconColor={c.teal}
          style={{ color: c.text, minHeight: 52 }}
        >
          {items.map((i) => (
            <Picker.Item key={i.value} label={i.label} value={i.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
export function Loading() {
  return (
    <View style={{ padding: 32, gap: 12, alignItems: "center" }}>
      <ActivityIndicator color={c.primary} accessibilityLabel="Memuat data" />
      <Text style={styles.muted}>Memuat data…</Text>
    </View>
  );
}
export function Message({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      style={error ? styles.error : styles.muted}
    >
      {text}
    </Text>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <View
      style={{
        height: 7,
        backgroundColor: c.mint,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 7,
          backgroundColor: c.teal,
          width: `${Math.max(0, Math.min(100, value))}%`,
        }}
      />
    </View>
  );
}

const icons = {
  home: House, report: FileText, check: Check, draft: FilePenLine,
  user: UserRound, shield: ShieldCheck, arrow: ArrowRight,
  filter: SlidersHorizontal, eye: Eye, eyeOff: EyeOff,
};
export function Icon({ name, color = c.teal, size = 22 }: { name: keyof typeof icons; color?: string; size?: number }) {
  const LucideIcon = icons[name];
  return <LucideIcon color={color} size={size} strokeWidth={1.8} accessible={false} />;
}
export function BrandHeader() {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
    <Image source={require("../../assets/logo-gass.webp")} contentFit="contain" style={{ width: 76, height: 42 }} accessibilityLabel="GASS" />
    <View style={{ borderLeftWidth: 1, borderLeftColor: c.border, paddingLeft: 10 }}>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: "700" }}>Dinas Kesehatan</Text>
      <Text style={{ color: c.muted, fontSize: 10, marginTop: 2 }}>Konawe Selatan</Text>
    </View>
  </View>;
}
export function Badge({ text, tone = "success" }: { text: string; tone?: "success" | "warning" | "neutral" | "danger" }) {
  const palette = { success: [c.mint, c.primary], warning: ["#FFF4D6", "#805500"], neutral: [c.soft, c.muted], danger: ["#FEECEB", c.danger] }[tone];
  return <View style={{ alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: palette[0] }}><Text style={{ color: palette[1], fontSize: 11, fontWeight: "700" }}>{text}</Text></View>;
}
export function EmptyState({ title, description, icon = "report" }: { title: string; description: string; icon?: keyof typeof icons }) {
  return <View style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}>
    <View style={{ backgroundColor: c.mint, padding: 16, borderRadius: 24 }}><Icon name={icon} size={28} /></View>
    <Text style={[styles.h2, { textAlign: "center" }]}>{title}</Text>
    <Text style={[styles.muted, { textAlign: "center", maxWidth: 280 }]}>{description}</Text>
  </View>;
}
export function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ gap: 4 }}><Text accessibilityRole="header" style={styles.h2}>{title}</Text>{subtitle && <Text style={styles.muted}>{subtitle}</Text>}</View>;
}
