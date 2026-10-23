import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, e) =>
        count < 1 && !(e instanceof ApiError && e.status < 500),
    },
    mutations: { retry: false, networkMode: "always" },
  },
});
