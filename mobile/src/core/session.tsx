import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { api, onSessionExpired, resetRequests, write } from "./api";
import { type User, userSchema } from "./domain";
import { queryClient } from "./query";
import { clearDrafts } from "../features/drafts/storage";
type Session = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const stop = onSessionExpired(() => {
      setUser(null);
      void queryClient.cancelQueries();
      queryClient.clear();
    });
    api<unknown>("/auth/me")
      .then((data) => {
        if (mounted) setUser(userSchema.parse(data));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      stop();
    };
  }, []);
  const login = async (identifier: string, password: string) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    resetRequests();
    const result = await write<{ user: unknown }>(
      "/auth/login",
      { identifier: identifier.trim(), password },
      "POST",
    );
    setUser(userSchema.parse(result.user));
  };
  const logout = async () => {
    // Revoke server session before declaring logout complete; failed/offline logout remains retryable.
    await api("/auth/logout", { method: "POST" });
    if (user) await clearDrafts(user.id);
    await queryClient.cancelQueries();
    queryClient.clear();
    resetRequests();
    setUser(null);
  };
  return (
    <Context.Provider value={{ user, loading, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
}
