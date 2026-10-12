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
const Auth = createContext<{
  user: User | undefined;
  isPending: boolean;
  error: Error | null;
}>({ user: undefined, isPending: true, error: null });
function AuthProvider({ children }: { children: React.ReactNode }) {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<User>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await api("/auth/refresh", { method: "POST" });
          return api<User>("/auth/me");
        }
        throw e;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  return (
    <Auth.Provider
      value={{ user: q.data, isPending: q.isPending, error: q.error }}
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
