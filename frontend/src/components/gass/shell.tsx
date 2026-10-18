"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  useSidebar,
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
import { api } from "@/lib/api";

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
    <div className="mx-2 mt-2.5 mb-2 rounded-xl border border-emerald-200/15 bg-white/8 p-3 text-xs text-emerald-50 shadow-xs group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F472B6] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F472B6]" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
            Pengingat Input
          </span>
        </div>
        <span className="text-[9px] font-medium text-emerald-50/75 px-1.5 py-0.5 rounded bg-white/8 border border-white/10">
          {allOpen ? "12 Bln Buka" : `${openCount} Bln Buka`}
        </span>
      </div>
      <p className="font-semibold text-[11px] leading-tight text-white">
        {settings.isOtomatisAktif
          ? `Batas Input: Tgl ${settings.batasTanggalInput}`
          : "Mode Pra-Launching"}
      </p>
      <p className="text-[10px] text-emerald-100/65 leading-snug mt-1">
        {settings.isOtomatisAktif
          ? `Penginputan capaian sebelum tanggal ${settings.batasTanggalInput} tiap bulan berikutnya.`
          : "Semua bulan dibuka untuk melengkapi data capaian awal faskes."}
      </p>
      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
        <span className="text-emerald-100/65">Admin Faskes</span>
        <Link
          href="/capaian/kinerja"
          className="font-medium text-emerald-200 hover:text-white hover:underline inline-flex items-center gap-0.5"
        >
          Isi Capaian <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
    </div>
  );
}

function MobileSidebarRouteSync({ path }: { path: string }) {
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [path, setOpenMobile]);

  return null;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { config } = useSidebarConfig();
  const { user, status, isPending, error } = useAuth(),
    path = usePathname(),
    router = useRouter(),
    client = useQueryClient();
  const [command, setCommand] = useState(false),
    [customizer, setCustomizer] = useState(false);
  const nav = navigation.filter((n) => user?.permissions.includes(n.key));
  const active = navigation.find((n) => path === n.href);
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);
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
  if (isPending || status === "unauthenticated")
    return (
      <div className="p-8 space-y-5">
        <Skeleton className="h-14 w-60" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (status === "error" || !user)
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
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      client.setQueryData(["me"], null);
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "me",
      });
      router.replace("/login");
    }
  };
  return (
    <SidebarProvider className="gass-app-shell">
      <MobileSidebarRouteSync path={path} />
      <Sidebar
        variant={config.variant}
        side={config.side}
        collapsible={config.collapsible}
        className="gass-main-sidebar"
      >
        <SidebarHeader className="gass-sidebar-header border-b border-sidebar-border px-3 py-4 group-data-[collapsible=icon]:px-2">
          <Link
            href="/dashboard"
            aria-label="Ke dashboard GASS"
            className="flex w-full items-center justify-center overflow-hidden"
          >
            <div className="gass-sidebar-logo-wrap">
              <Image
                src="/branding/logo-gass.png"
                alt="Logo GASS"
                width={1312}
                height={1199}
                className="gass-sidebar-logo"
                priority
              />
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          {["MONITORING", "DATA MASTER", "ADMINISTRASI"].map((group) => {
            const items = nav.filter((n) => n.group === group);
            return (
              items.length > 0 && (
                <SidebarGroup key={group}>
                  <SidebarGroupLabel className="text-[9px] font-bold tracking-[.18em] text-emerald-100/55 uppercase">
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
                            className="h-10 rounded-lg border-l-2 border-transparent px-3 text-emerald-50/75 hover:bg-white/8 hover:text-white data-[active=true]:border-[#F472B6] data-[active=true]:bg-white/12 data-[active=true]:font-bold data-[active=true]:text-white data-[active=true]:shadow-sm transition-all"
                          >
                            <Link href={n.href}>
                              <n.icon className="size-4" />
                              <span>{n.title}</span>
                              {path === n.href && (
                                <span className="ml-auto size-1.5 rounded-full bg-[#F472B6] shadow-[0_0_9px_#DB2777] group-data-[collapsible=icon]:hidden" />
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
        <SidebarFooter className="gass-sidebar-footer p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1">
              <Avatar className="size-9 border border-emerald-200/20">
                <AvatarFallback className="bg-white/12 text-emerald-100 font-bold">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 text-left flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-xs font-semibold text-sidebar-foreground">
                  {user.name}
                </span>
                <span className="text-[10px] text-sidebar-foreground/60">
                  {roleNames[user.role]}
                </span>
              </span>
              <ChevronsUpDown className="size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuLabel>{user.nip}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  logout();
                }}
              >
                <LogOut />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="gass-workspace min-w-0">
        <header className="gass-app-header sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2.5 border-b px-4 sm:px-5 lg:px-8">
          <SidebarTrigger className="size-10 shrink-0 rounded-xl border bg-card shadow-xs hover:bg-primary/5 hover:text-primary sm:size-9" />
          <Image
            src="/branding/logo-gass.png"
            alt="GASS"
            width={1312}
            height={1199}
            className="size-8 object-contain sm:hidden"
          />
          <span className="h-4 border-l mx-1 hidden sm:block" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Ruang kerja
          </span>
          <span className="text-muted-foreground/50 hidden sm:inline">/</span>
          <span className="min-w-0 truncate text-xs font-semibold text-primary">
            {active?.title || "GASS"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommand(true)}
              className="border-emerald-900/10 bg-white/80 text-muted-foreground shadow-xs hover:border-primary/25 hover:bg-white hover:text-primary"
            >
              <Search className="size-4" />
              <span className="hidden md:inline mr-8">Cari menu…</span>
              <kbd className="hidden sm:inline text-[10px]">⌘ K</kbd>
            </Button>
            <ModeToggle />
            <ThemeCustomizerTrigger onClick={() => setCustomizer(true)} />
          </div>
        </header>
        <section className="gass-app-content flex-1 p-4 sm:p-5 lg:p-8 max-w-[1800px] w-full mx-auto">
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
        <footer className="gass-app-footer px-4 sm:px-8 py-4 border-t flex flex-col gap-1.5 sm:flex-row sm:justify-between text-[10px] text-muted-foreground">
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
