"use client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { api, ApiError } from "@/lib/api";
export interface User {
  id: string;
  name: string;
  nip: string;
  role: string;
  faskesId: string | null;
  bidangId: string | null;
  permissions: string[];
  faskes?: { namaFaskes: string };
  bidang?: { namaBidang: string };
}
export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";
const Auth = createContext<{
  user: User | undefined;
  status: AuthStatus;
  isPending: boolean;
  error: Error | null;
}>({ user: undefined, status: "loading", isPending: true, error: null });
function AuthProvider({ children }: { children: React.ReactNode }) {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          try {
            return await api<User>("/auth/me");
          } catch (confirmationError) {
            if (
              confirmationError instanceof ApiError &&
              (confirmationError.status === 401 ||
                confirmationError.status === 403)
            )
              return null;
            throw confirmationError;
          }
        }
        if (e instanceof ApiError && e.status === 403)
          return null;
        throw e;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  const status: AuthStatus = q.isPending
    ? "loading"
    : q.error
      ? "error"
      : q.data
        ? "authenticated"
        : "unauthenticated";
  return (
    <Auth.Provider
      value={{
        user: status === "authenticated" ? q.data || undefined : undefined,
        status,
        isPending: status === "loading",
        error: q.error,
      }}
    >
      {children}
    </Auth.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme="light" storageKey="gass-theme">
        <SidebarConfigProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </SidebarConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export const useAuth = () => useContext(Auth);
