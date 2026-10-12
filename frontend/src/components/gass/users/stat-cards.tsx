"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, ShieldAlert, Building2 } from "lucide-react";

interface StatCardsProps {
  totalPegawai?: number;
  totalActiveUsers?: number;
  totalUnitKerja?: number;
  isLoading?: boolean;
}

export function StatCards({
  totalPegawai = 0,
  totalActiveUsers = 0,
  totalUnitKerja = 0,
  isLoading = false,
}: StatCardsProps) {
  const stats = [
    {
      title: "Total Pegawai ASN Dinkes",
      value: isLoading ? "..." : totalPegawai.toLocaleString("id-ID"),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      description: "Data riil E-Gov & SIMPEG",
    },
    {
      title: "Pengguna Aktif GASS",
      value: isLoading ? "..." : totalActiveUsers.toLocaleString("id-ID"),
      icon: UserCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      description: "Telah memiliki hak akses peran",
    },
    {
      title: "Belum Diberi Akses",
      value: isLoading
        ? "..."
        : Math.max(0, totalPegawai - totalActiveUsers).toLocaleString("id-ID"),
      icon: ShieldAlert,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      description: "Pegawai belum ditugaskan peran",
    },
    {
      title: "Unit Kerja & Puskesmas",
      value: isLoading ? "..." : totalUnitKerja.toLocaleString("id-ID"),
      icon: Building2,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
      description: "UPTD Puskesmas & Kantor Induk",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
