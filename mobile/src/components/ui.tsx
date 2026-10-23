import { type PropsWithChildren } from "react";
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
import { Picker } from "@react-native-picker/picker";
import { colors as c } from "../core/theme";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },
  content: {
    padding: 20,
    gap: 16,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  card: {
    backgroundColor: c.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  title: { fontSize: 28, fontWeight: "800", color: c.text },
  h2: { fontSize: 19, fontWeight: "700", color: c.text },
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
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    color: c.text,
    backgroundColor: c.white,
    fontSize: 16,
  },
  badge: { color: c.teal, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  error: { color: c.danger, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
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
      <Text style={styles.title}>{title}</Text>
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
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        style={styles.input}
        {...props}
      />
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
          style={{ color: c.text }}
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
    <View style={{ padding: 32 }}>
      <ActivityIndicator color={c.primary} accessibilityLabel="Memuat data" />
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
