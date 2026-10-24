import { useCallback } from "react";
import { Alert, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { useSession } from "../../core/session";
import { allowed, canWrite, months, format } from "../../core/domain";
import { errorText } from "../../core/api";
import { listDrafts, deleteDraft } from "../../features/drafts/storage";
import {
  Badge,
  EmptyState,
  Button,
  Card,
  Heading,
  Loading,
  Message,
  styles,
} from "../../components/ui";
export default function Drafts() {
  const { user } = useSession();
  const query = useQuery({
    queryKey: ["drafts", user?.id],
    queryFn: () => listDrafts(user!.id),
    enabled: !!user,
    networkMode: "always",
    staleTime: 0,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  if (!user || !canWrite(user))
    return <Message text="Draf tidak tersedia untuk akun ini." />;
  return (
    <View style={styles.page}>
      <FlashList
        data={
          query.data?.filter((d) => allowed(user, `capaian_${d.kind}`)) ?? []
        }
        keyExtractor={(d) => String(d.slot)}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 20 }}>
            <Heading
              title="Draf lapangan"
              subtitle="Tersimpan di perangkat • belum dikirim"
            />
            <Card><Badge text={`${query.data?.filter((d) => allowed(user, `capaian_${d.kind}`)).length ?? 0} DRAF DI PERANGKAT`} /><Message text="Draf disimpan hingga 7 hari. Tinjau dan kirim ketika koneksi tersedia." /></Card>
            {query.isError && <Message error text={errorText(query.error)} />}
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : (
            <EmptyState icon="draft" title="Draf Anda masih kosong" description="Simpan laporan sebagai draf saat di lapangan. Lanjutkan pemeriksaan dan pengiriman dari sini." />
          )
        }
        renderItem={({ item: d }) => (
          <View style={{ marginBottom: 12 }}>
            <Card>
              <Text style={styles.badge}>
                {d.kind.toUpperCase()} • {months[d.input.bulan - 1]}{" "}
                {d.input.tahun}
              </Text>
              <Badge text="Belum dikirim" tone="warning" />
              <Text style={styles.h2}>{d.label}</Text>
              <Text style={styles.text}>
                Realisasi: {format(d.input.nilai)}
              </Text>
              <Button
                title="Tinjau & kirim"
                onPress={() =>
                  router.push({
                    pathname: "/report",
                    params: {
                      kind: d.kind,
                      year: String(d.input.tahun),
                      month: String(d.input.bulan),
                      draft: String(d.slot),
                    },
                  })
                }
              />
              <Button
                secondary
                title="Hapus draf"
                onPress={() =>
                  Alert.alert(
                    "Hapus draf?",
                    "Draf ini belum dikirim ke server.",
                    [
                      { text: "Batal", style: "cancel" },
                      {
                        text: "Hapus",
                        style: "destructive",
                        onPress: () => {
                          void deleteDraft(user.id, d.slot)
                            .then(() => refetch())
                            .catch((e) =>
                              Alert.alert("Gagal menghapus", errorText(e)),
                            );
                        },
                      },
                    ],
                  )
                }
              />
            </Card>
          </View>
        )}
      />
    </View>
  );
}
