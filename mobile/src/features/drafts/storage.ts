import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import { reportInput } from "../../core/domain";
const schema = z.object({
  kind: z.enum(["kinerja", "keuangan"]),
  label: z.string().max(160),
  input: reportInput,
  savedAt: z.number(),
});
export type Draft = z.infer<typeof schema> & { slot: number };
const slots = 30;
const ttl = 7 * 86400000;
const key = (owner: string, slot: number) =>
  `gass.draft.v1.${Array.from(owner)
    .map((c) => c.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("")}.${slot}`;
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action);
  queue = next.catch(() => {});
  return next;
}
async function readDrafts(owner: string): Promise<Draft[]> {
  const result: Draft[] = [];
  // Bounded storage and sequential reads prevent large bridge/memory bursts.
  for (let slot = 0; slot < slots; slot++) {
    const raw = await SecureStore.getItemAsync(key(owner, slot));
    if (!raw) continue;
    let parsed: ReturnType<typeof schema.safeParse>;
    try {
      parsed = schema.safeParse(JSON.parse(raw));
    } catch {
      parsed = schema.safeParse(null);
    }
    if (!parsed.success || Date.now() - parsed.data.savedAt > ttl) {
      await SecureStore.deleteItemAsync(key(owner, slot));
      continue;
    }
    result.push({ ...parsed.data, slot });
  }
  return result;
}
export function saveDraft(
  owner: string,
  draft: Omit<Draft, "slot" | "savedAt">,
) {
  return serial(async () => {
    const existing = await readDrafts(owner);
    const match = existing.find(
      (d) =>
        d.kind === draft.kind &&
        d.input.entityId === draft.input.entityId &&
        d.input.faskesId === draft.input.faskesId &&
        d.input.tahun === draft.input.tahun &&
        d.input.bulan === draft.input.bulan,
    );
    const slot =
      match?.slot ??
      Array.from({ length: slots }, (_, i) => i).find(
        (i) => !existing.some((d) => d.slot === i),
      );
    if (slot === undefined)
      throw new Error(
        "Penyimpanan penuh (30 draf). Kirim atau hapus draf terlebih dahulu.",
      );
    const value = JSON.stringify(
      schema.parse({
        ...draft,
        label: draft.label.slice(0, 160),
        savedAt: Date.now(),
      }),
    );
    if (new TextEncoder().encode(value).length > 2000)
      throw new Error("Draf terlalu besar.");
    await SecureStore.setItemAsync(key(owner, slot), value, options);
  });
}
export const deleteDraft = (owner: string, slot: number) =>
  serial(() => SecureStore.deleteItemAsync(key(owner, slot)));
export const clearDrafts = (owner: string) =>
  serial(async () => {
    for (let i = 0; i < slots; i++)
      await SecureStore.deleteItemAsync(key(owner, i));
  });

export const listDrafts = (owner: string) => serial(() => readDrafts(owner));
