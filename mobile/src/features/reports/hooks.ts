import { useQuery } from "@tanstack/react-query";
import { api } from "../../core/api";
import {
  type Kind,
  type Reports,
  type Options,
  allowed,
} from "../../core/domain";
import { useSession } from "../../core/session";
export function useReports(kind: Kind, year: number, facility = "") {
  const { user } = useSession();
  return useQuery({
    queryKey: ["reports", user?.id, kind, year, facility],
    queryFn: ({ signal }) =>
      api<Reports>(
        `/capaian/${kind}?tahun=${year}${facility ? `&faskesId=${encodeURIComponent(facility)}` : ""}`,
        { signal },
      ),
    enabled: !!user && allowed(user, `capaian_${kind}`),
    refetchInterval: 60_000,
  });
}
export function useOptions() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["options", user?.id],
    queryFn: ({ signal }) => api<Options>("/options", { signal }),
    staleTime: 5 * 60_000,
    enabled: !!user,
  });
}
