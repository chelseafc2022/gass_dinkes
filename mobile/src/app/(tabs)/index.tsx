import Dashboard from "../../features/dashboard/Dashboard";
import ExecutiveDashboard from "../../features/dashboard/ExecutiveDashboard";
import { useSession } from "../../core/session";

export default function Home() {
  const { user } = useSession();
  return user?.role === "KEPALA_DINAS" ? <ExecutiveDashboard /> : <Dashboard />;
}
