"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Search,
  LogOut,
  ChevronsUpDown,
  ArrowUpRight,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  ThemeCustomizer,
  ThemeCustomizerTrigger,
} from "@/components/theme-customizer";
import { useSidebarConfig } from "@/contexts/sidebar-context";
import { ModeToggle } from "@/components/mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "./providers";
import { navigation, roleNames } from "./navigation";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

function SidebarPeriodAlert() {
  const { data } = useQuery({
    queryKey: ["periode-status"],
    queryFn: () => api("/periode-status"),
    staleTime: 60_000,
  });

  if (!data?.settings) return null;
  const { settings, months } = data;
  const openCount = months?.filter((m: any) => m.open).length ?? 0;
  const allOpen = openCount === 12;

  return (
    <div className="mx-2 mt-2.5 mb-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs shadow-xs">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Pengingat Input
          </span>
        </div>
        <span className="text-[9px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-background border border-primary/20">
          {allOpen ? "12 Bln Buka" : `${openCount} Bln Buka`}
        </span>
      </div>
      <p className="font-semibold text-[11px] leading-tight text-foreground">
        {settings.isOtomatisAktif
          ? `Batas Input: Tgl ${settings.batasTanggalInput}`
          : "Mode Pra-Launching"}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug mt-1">
        {settings.isOtomatisAktif
          ? `Penginputan capaian sebelum tanggal ${settings.batasTanggalInput} tiap bulan berikutnya.`
          : "Semua bulan dibuka untuk melengkapi data capaian awal faskes."}
      </p>
      <div className="mt-2.5 pt-2 border-t border-primary/15 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Admin Faskes</span>
        <Link
          href="/capaian/kinerja"
          className="font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        >
          Isi Capaian <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
    </div>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const { config } = useSidebarConfig();
  const { user, isPending, error } = useAuth(),
    path = usePathname(),
    router = useRouter(),
    client = useQueryClient();
  const [command, setCommand] = useState(false),
    [customizer, setCustomizer] = useState(false);
  const nav = navigation.filter((n) => user?.permissions.includes(n.key));
  const active = navigation.find((n) => path === n.href);
  useEffect(() => {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    )
      router.replace("/login");
  }, [error, router]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  if (isPending)
    return (
      <div className="p-8 space-y-5">
        <Skeleton className="h-14 w-60" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (!user)
    return (
      <div className="grid min-h-screen place-content-center gap-4 text-center">
        <HeartPulse className="mx-auto size-10 text-primary" />
        <p>{error?.message || "Memuat sesi Anda…"}</p>
        <Button onClick={() => client.invalidateQueries({ queryKey: ["me"] })}>
          Coba kembali
        </Button>
        <Link href="/login">Ke halaman masuk</Link>
      </div>
    );
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      client.clear();
      router.replace("/login");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <SidebarProvider>
      <Sidebar
        variant={config.variant}
        side={config.side}
        collapsible={config.collapsible}
      >
        <SidebarHeader className="px-5 py-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="brand-icon shadow-xs bg-sidebar-primary text-sidebar-primary-foreground">
              <Activity className="size-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-sidebar-foreground">
                GASS<span className="text-sidebar-primary">.</span>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-sidebar-foreground/60">
                Dinas Kesehatan
              </p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          {["MONITORING", "DATA MASTER", "ADMINISTRASI"].map((group) => {
            const items = nav.filter((n) => n.group === group);
            return (
              items.length > 0 && (
                <SidebarGroup key={group}>
                  <SidebarGroupLabel className="text-[10px] font-bold tracking-widest text-sidebar-foreground/60 uppercase">
                    {group}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((n) => (
                        <SidebarMenuItem key={n.key}>
                          <SidebarMenuButton
                            asChild
                            isActive={path === n.href}
                            tooltip={n.title}
                            className="h-10 px-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-white data-[active=true]:dark:bg-emerald-950/40 data-[active=true]:text-sidebar-primary data-[active=true]:font-bold data-[active=true]:shadow-xs data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary transition-colors"
                          >
                            <Link href={n.href}>
                              <n.icon className="size-4" />
                              <span>{n.title}</span>
                              {path === n.href && (
                                <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_8px_var(--sidebar-primary)]" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                  {group === "MONITORING" &&
                    user.role === "OPERATOR_PUSKESMAS" && (
                      <SidebarPeriodAlert />
                    )}
                </SidebarGroup>
              )
            );
          })}
        </SidebarContent>
        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors">
              <Avatar className="size-9 border border-sidebar-primary/25">
                <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary font-bold">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 text-left flex-1">
                <span className="block truncate text-xs font-semibold text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="text-[10px] text-sidebar-foreground/60">
                  {roleNames[user.role]}
                </span>
              </span>
              <ChevronsUpDown className="size-4 text-sidebar-foreground/60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuLabel>{user.nip}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-17 shrink-0 items-center gap-3 border-b bg-card px-5 lg:px-8">
          <SidebarTrigger />
          <span className="h-4 border-l mx-1" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Ruang kerja
          </span>
          <span className="text-muted-foreground/50 hidden sm:inline">/</span>
          <span className="text-xs font-medium">{active?.title || "GASS"}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand(true)}
              className="text-muted-foreground"
            >
              <Search className="size-4" />
              <span className="hidden md:inline mr-8">Cari menu…</span>
              <kbd className="hidden sm:inline text-[10px]">⌘ K</kbd>
            </Button>
            <ModeToggle />
            <ThemeCustomizerTrigger onClick={() => setCustomizer(true)} />
          </div>
        </header>
        <section className="flex-1 p-5 lg:p-8 max-w-[1800px] w-full mx-auto">
          {active && !user.permissions.includes(active.key) ? (
            <div className="empty-state">
              <ShieldCheck />
              <h2>Akses terbatas</h2>
              <p>Menu ini tidak tersedia untuk peran Anda.</p>
            </div>
          ) : (
            children
          )}
        </section>
        <footer className="px-8 py-4 border-t flex justify-between text-[10px] text-muted-foreground">
          <span>© {new Date().getFullYear()} GASS · Dinas Kesehatan</span>
          <span className="flex items-center gap-1">
            Gerakan Aksi Sehat Setara <ArrowUpRight className="size-3" />
          </span>
        </footer>
      </SidebarInset>
      <ThemeCustomizer open={customizer} onOpenChange={setCustomizer} />
      <CommandDialog open={command} onOpenChange={setCommand}>
        <CommandInput placeholder="Cari halaman atau menu…" />
        <CommandList>
          <CommandEmpty>Menu tidak ditemukan.</CommandEmpty>
          <CommandGroup heading="Navigasi">
            {nav.map((n) => (
              <CommandItem
                key={n.key}
                onSelect={() => {
                  router.push(n.href);
                  setCommand(false);
                }}
              >
                <n.icon />
                {n.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
