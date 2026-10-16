"use client";

import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/lib/api";
import { StatCards } from "./stat-cards";
import {
  GASS_ROLES,
  SetRoleDialog,
  TargetPegawai,
} from "./set-role-dialog";
import { RevokeRoleDialog } from "./revoke-role-dialog";
import { SearchableCombobox } from "./searchable-combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Building2,
  FilterX,
  RefreshCw,
  Edit3,
  UserX,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";

const DINKES_INSTANSI_ID = "tuwRgWDzmfad28n8Z";

export function UsersManagement() {
  // Tab aktif
  const [activeTab, setActiveTab] = useState<string>("gass_users");

  // Filter & Search states
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const selectedInstansi = DINKES_INSTANSI_ID; // Terkunci khusus DINAS KESEHATAN
  const [selectedUnitKerja, setSelectedUnitKerja] = useState("all");

  // Pagination states
  const [pageUsers, setPageUsers] = useState(1);
  const [pageDirectory, setPageDirectory] = useState(1);

  // Dialog states
  const [setRoleOpen, setSetRoleOpen] = useState(false);
  const [revokeRoleOpen, setRevokeRoleOpen] = useState(false);
  const [targetPegawai, setTargetPegawai] = useState<TargetPegawai | null>(null);

  // 1. Fetch Ringkasan Statistik
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["users-stats"],
    queryFn: () => api("/admin/users/stats"),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Pengguna Lokal Aktif GASS
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: [
      "users",
      pageUsers,
      debouncedSearch,
      roleFilter,
      statusFilter,
      selectedUnitKerja,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pageUsers),
        limit: "10",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      return api(`/admin/users?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  // 3. Fetch List Instansi dari SIMPEG
  const { data: instansiList = [] } = useQuery({
    queryKey: ["simpeg-instansi"],
    queryFn: () => api("/admin/pegawai/instansi"),
    staleTime: 10 * 60 * 1000,
  });

  // 4. Fetch List Sub Unit Kerja (Puskesmas / Dinkes) berdasarkan Instansi
  const { data: unitKerjaList = [] } = useQuery({
    queryKey: ["simpeg-unit-kerja", selectedInstansi],
    queryFn: () =>
      api(
        `/admin/pegawai/unit-kerja?instansiId=${encodeURIComponent(
          selectedInstansi,
        )}`,
      ),
    staleTime: 10 * 60 * 1000,
  });

  // 5. Fetch Direktori Pegawai E-Gov & SIMPEG terpaginasi
  const {
    data: directoryResponse,
    isLoading: isLoadingDirectory,
    isFetching: isFetchingDirectory,
    refetch: refetchDirectory,
  } = useQuery({
    queryKey: [
      "pegawai-directory",
      pageDirectory,
      debouncedSearch,
      selectedInstansi,
      selectedUnitKerja,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pageDirectory),
        limit: "10",
        instansiId: selectedInstansi,
        unitKerjaId: selectedUnitKerja,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      return api(`/admin/pegawai/directory?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const usersList = Array.isArray(usersResponse?.data)
    ? usersResponse.data
    : Array.isArray(usersResponse)
      ? usersResponse
      : [];
  const usersMeta = usersResponse?.meta || {
    page: 1,
    totalPages: 1,
    total: usersList.length,
  };

  const directoryList = directoryResponse?.data || [];
  const directoryMeta = directoryResponse?.meta || {
    page: 1,
    totalPages: 1,
    total: 0,
  };

  // Options untuk SearchableCombobox (Hanya Dinas Kesehatan, instansi lain tidak dimunculkan)
  const dinkesLabel = useMemo(() => {
    const dinkes = instansiList.find(
      (ins: any) =>
        String(ins.id) === DINKES_INSTANSI_ID ||
        ins.instansi?.toUpperCase().includes("KESEHATAN"),
    );
    return dinkes?.instansi || "DINAS KESEHATAN";
  }, [instansiList]);

  const instansiOptions = useMemo(() => {
    return [
      {
        id: DINKES_INSTANSI_ID,
        label: dinkesLabel,
      },
    ];
  }, [dinkesLabel]);

  const unitKerjaOptions = useMemo(() => {
    return unitKerjaList.map((uk: any) => ({
      id: String(uk.id),
      label: uk.unitKerja,
    }));
  }, [unitKerjaList]);

  const getRoleBadge = (roleName?: string | null) => {
    if (!roleName) return null;
    const roleConfig = GASS_ROLES.find((r) => r.value === roleName);
    if (!roleConfig) {
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {roleName}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        title={roleConfig.label}
        className={`text-[10px] px-2 py-0.5 font-medium whitespace-nowrap shrink-0 ${roleConfig.badgeClass}`}
      >
        {roleConfig.shortLabel || roleConfig.label}
      </Badge>
    );
  };

  const handleOpenSetRole = (pegawai: TargetPegawai) => {
    setTargetPegawai(pegawai);
    setSetRoleOpen(true);
  };

  const handleOpenRevokeRole = (pegawai: TargetPegawai) => {
    setTargetPegawai(pegawai);
    setRevokeRoleOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <StatCards
        totalPegawai={statsData?.totalPegawai || directoryMeta.total || 0}
        totalActiveUsers={statsData?.totalActiveUsers || 0}
        totalUnitKerja={statsData?.totalUnitKerja || unitKerjaList.length || 0}
        isLoading={isLoadingStats || isLoadingDirectory}
      />

      {/* Main Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setSearch("");
        }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
          <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
            <TabsList className="bg-muted/60 p-1 flex w-max min-w-full sm:w-auto sm:min-w-0">
              <TabsTrigger
                value="gass_users"
                className="gap-1.5 text-xs whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Pengguna Aktif GASS</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 ml-1 font-mono"
                >
                  {statsData?.totalActiveUsers ?? usersMeta.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="egov_directory"
                className="gap-1.5 text-xs whitespace-nowrap"
              >
                <Database className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Registrasi User GASS</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 ml-1 font-mono"
                >
                  {directoryMeta.total || statsData?.totalPegawai || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === "gass_users") refetchUsers();
                else refetchDirectory();
              }}
              disabled={isFetchingUsers || isFetchingDirectory}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  isFetchingUsers || isFetchingDirectory ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Segarkan Data</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setActiveTab("egov_directory");
                setSearch("");
              }}
              className="text-xs h-8 gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tetapkan Peran Pegawai</span>
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PENGGUNA AKTIF GASS DINKES                         */}
        {/* ========================================================= */}
        <TabsContent value="gass_users" className="space-y-4 m-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Daftar Pengguna Aktif Sistem GASS
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pegawai ASN Dinas Kesehatan & Puskesmas yang telah memiliki
                    hak akses peran aktif di GASS.
                  </p>
                </div>

                {(roleFilter !== "ALL" ||
                  statusFilter !== "ALL" ||
                  search) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRoleFilter("ALL");
                      setStatusFilter("ALL");
                      setSearch("");
                      setPageUsers(1);
                    }}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
                    title="Reset Filter"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset Filter
                  </Button>
                )}
              </div>

              {/* Toolbar Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari NIP, nama, atau jabatan..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPageUsers(1);
                    }}
                    className="pl-8 text-xs h-9 bg-background"
                  />
                </div>

                <div className="w-full">
                  <Select
                    value={roleFilter}
                    onValueChange={(val) => {
                      setRoleFilter(val);
                      setPageUsers(1);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs h-9 bg-background">
                      <SelectValue placeholder="Filter Peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">
                        Semua Peran
                      </SelectItem>
                      {GASS_ROLES.map((r) => (
                        <SelectItem
                          key={r.value}
                          value={r.value}
                          className="text-xs"
                        >
                          {r.shortLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full">
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val);
                      setPageUsers(1);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs h-9 bg-background">
                      <SelectValue placeholder="Status Akun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">
                        Semua Status
                      </SelectItem>
                      <SelectItem value="AKTIF" className="text-xs">
                        Aktif
                      </SelectItem>
                      <SelectItem value="NONAKTIF" className="text-xs">
                        Non-Aktif
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                      <TableHead className="w-[40px] text-center text-xs">
                        No
                      </TableHead>
                      <TableHead className="text-xs w-[160px] whitespace-nowrap">NIP ASN</TableHead>
                      <TableHead className="text-xs min-w-[170px] max-w-[240px]">Nama Lengkap & Gelar</TableHead>
                      <TableHead className="text-xs">Peran / Otoritas</TableHead>
                      <TableHead className="text-xs">Penugasan Wilayah</TableHead>
                      <TableHead className="text-xs text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-xs text-right pr-4">
                        Tindakan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-xs text-muted-foreground"
                        >
                          Memuat data pengguna...
                        </TableCell>
                      </TableRow>
                    ) : usersList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-xs text-muted-foreground"
                        >
                          Tidak ada pengguna yang sesuai kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersList.map((user: any, idx: number) => {
                        const rowNumber = (pageUsers - 1) * 10 + idx + 1;
                        const penugasan =
                          user.faskes?.namaFaskes ||
                          user.bidang?.namaBidang ||
                          "Dinas Kesehatan (Induk)";

                        return (
                          <TableRow
                            key={user.id}
                            className="text-xs hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="text-center font-mono text-muted-foreground">
                              {rowNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-foreground font-medium">
                                {user.nip}
                              </div>
                              {user.username && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  @{user.username}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <span
                                className="font-semibold text-foreground block line-clamp-2 leading-snug break-words"
                                title={user.name}
                              >
                                {user.name}
                              </span>
                              {user.jabatan && (
                                <span
                                  className="text-muted-foreground block text-[11px] line-clamp-1 truncate mt-0.5"
                                  title={user.jabatan}
                                >
                                  {user.jabatan}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{penugasan}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {user.isActive ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1"
                                >
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/10 gap-1"
                                >
                                  <XCircle className="h-2.5 w-2.5" />
                                  Nonaktif
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenSetRole({
                                      nip: user.nip,
                                      namaLengkap: user.name,
                                      username: user.username,
                                      jabatan: user.jabatan,
                                      currentRole: user.role,
                                      currentStatus: user.isActive
                                        ? "AKTIF"
                                        : "NONAKTIF",
                                      faskesId: user.faskesId,
                                      bidangId: user.bidangId,
                                      email: user.email,
                                    })
                                  }
                                  className="h-7 text-xs px-2 gap-1"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  Ubah Peran
                                </Button>
                                {user.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenRevokeRole({
                                        nip: user.nip,
                                        namaLengkap: user.name,
                                        username: user.username,
                                        currentRole: user.role,
                                      })
                                    }
                                    className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Nonaktifkan Akun"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Pengguna Aktif */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">
                  Menampilkan {usersList.length} dari total {usersMeta.total}{" "}
                  pengguna terdaftar
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageUsers((p) => Math.max(1, p - 1))}
                    disabled={pageUsers <= 1}
                    className="h-8 px-2.5"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Sebelumnya
                  </Button>
                  <span className="text-muted-foreground px-2 font-mono">
                    Halaman {usersMeta.page} / {usersMeta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPageUsers((p) => Math.min(usersMeta.totalPages, p + 1))
                    }
                    disabled={pageUsers >= usersMeta.totalPages}
                    className="h-8 px-2.5"
                  >
                    Berikutnya
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================= */}
        {/* TAB 2: DIREKTORI PEGAWAI DINKES DARI E-GOV & SIMPEG       */}
        {/* ========================================================= */}
        <TabsContent value="egov_directory" className="space-y-4 m-0">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Registrasi User GASS
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pilih pegawai untuk menetapkan peran di sistem
                    GASS.
                  </p>
                </div>

                {(search || selectedUnitKerja !== "all") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUnitKerja("all");
                      setSearch("");
                      setPageDirectory(1);
                    }}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start sm:self-auto"
                    title="Reset Filter"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset Filter
                  </Button>
                )}
              </div>

              {/* Toolbar Filter Registrasi User GASS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Search box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari NIP, nama pegawai, jabatan..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPageDirectory(1);
                    }}
                    className="pl-8 text-xs h-9 bg-background"
                  />
                </div>

                {/* Filter Instansi: DINAS KESEHATAN */}
                <div>
                  <div
                    className="h-9 w-full flex items-center rounded-md border border-input bg-muted/40 px-2.5 text-xs text-foreground select-none transition-colors"
                    title="Instansi DINAS KESEHATAN"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate text-foreground">
                        {dinkesLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Combobox Sub Unit Kerja / Puskesmas */}
                <div>
                  <SearchableCombobox
                    value={selectedUnitKerja}
                    onValueChange={(val) => {
                      setSelectedUnitKerja(val);
                      setPageDirectory(1);
                    }}
                    items={unitKerjaOptions}
                    placeholder="Semua Sub Unit / Puskesmas"
                    searchPlaceholder="Cari Puskesmas / Sub Unit..."
                    emptyText="Sub unit tidak ditemukan."
                    allLabel="-- Semua Sub Unit / Puskesmas --"
                    icon={
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    }
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/40">
                      <TableHead className="w-[40px] text-center text-xs">
                        No
                      </TableHead>
                      <TableHead className="text-xs w-[160px] whitespace-nowrap">NIP ASN</TableHead>
                      <TableHead className="text-xs min-w-[170px] max-w-[220px]">Nama Lengkap & Gelar</TableHead>
                      <TableHead className="text-xs min-w-[170px] max-w-[220px]">Jabatan</TableHead>
                      <TableHead className="text-xs min-w-[180px] max-w-[240px]">
                        Sub Unit / Puskesmas
                      </TableHead>
                      <TableHead className="text-xs w-[130px] whitespace-nowrap">Status Hak Akses</TableHead>
                      <TableHead className="text-xs text-right pr-4 w-[130px] whitespace-nowrap">
                        Otorisasi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDirectory ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-xs text-muted-foreground"
                        >
                          Menarik data dari database User Simpeg...
                        </TableCell>
                      </TableRow>
                    ) : directoryList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-32 text-center text-xs text-muted-foreground"
                        >
                          Tidak ada pegawai yang sesuai dengan filter atau kata
                          kunci.
                        </TableCell>
                      </TableRow>
                    ) : (
                      directoryList.map((pegawai: any, idx: number) => {
                        const rowNumber = (pageDirectory - 1) * 10 + idx + 1;
                        const hasAccess = pegawai.hasGassAccess;

                        return (
                          <TableRow
                            key={pegawai.nip + idx}
                            className="text-xs hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="text-center font-mono text-muted-foreground">
                              {rowNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-foreground font-medium">
                                {pegawai.nip}
                              </div>
                              {pegawai.username && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  @{pegawai.username}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <span
                                className="font-semibold text-foreground block line-clamp-2 leading-snug break-words"
                                title={pegawai.namaLengkap}
                              >
                                {pegawai.namaLengkap}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[220px]">
                              <span
                                className="text-muted-foreground block line-clamp-2 leading-snug break-words"
                                title={pegawai.jabatan}
                              >
                                {pegawai.jabatan || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <div className="flex items-center gap-1.5 text-foreground font-medium">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span
                                  className="line-clamp-2 leading-snug break-words"
                                  title={pegawai.unitKerja}
                                >
                                  {pegawai.unitKerja}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {hasAccess ? (
                                <div className="space-y-1">
                                  {getRoleBadge(pegawai.gassRole)}
                                  {(pegawai.faskes || pegawai.bidang) && (
                                    <div className="text-[10px] text-muted-foreground">
                                      {pegawai.faskes?.namaFaskes ||
                                        pegawai.bidang?.namaBidang}
                                    </div>
                                  )}
                                </div>
                              ) : pegawai.gassStatus === "NONAKTIF" ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 border-destructive/30 text-destructive bg-destructive/10"
                                >
                                  Non-Aktif
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 text-muted-foreground font-normal border-border/80"
                                >
                                  Belum Diberi Akses
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                variant={hasAccess ? "outline" : "default"}
                                onClick={() =>
                                  handleOpenSetRole({
                                    nip: pegawai.nip,
                                    namaLengkap: pegawai.namaLengkap,
                                    jabatan: pegawai.jabatan,
                                    opd: pegawai.opd,
                                    unitKerja: pegawai.unitKerja,
                                    currentRole: pegawai.gassRole,
                                    currentStatus: pegawai.gassStatus,
                                    username: pegawai.username,
                                    faskesId: pegawai.faskesId,
                                    bidangId: pegawai.bidangId,
                                    email: pegawai.email,
                                  })
                                }
                                className="h-7 text-xs px-2.5 gap-1"
                              >
                                {hasAccess ? (
                                  <>
                                    <Edit3 className="h-3 w-3" />
                                    Kelola Peran
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-3 w-3" />
                                    Tetapkan Peran
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Direktori ASN */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">
                  Menampilkan {directoryList.length} dari total{" "}
                  {directoryMeta.total} pegawai ASN Dinkes
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageDirectory((p) => Math.max(1, p - 1))}
                    disabled={pageDirectory <= 1}
                    className="h-8 px-2.5"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Sebelumnya
                  </Button>
                  <span className="text-muted-foreground px-2 font-mono">
                    Halaman {directoryMeta.page} / {directoryMeta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPageDirectory((p) =>
                        Math.min(directoryMeta.totalPages, p + 1),
                      )
                    }
                    disabled={pageDirectory >= directoryMeta.totalPages}
                    className="h-8 px-2.5"
                  >
                    Berikutnya
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Tetapkan / Ubah Role */}
      <SetRoleDialog
        open={setRoleOpen}
        onOpenChange={setSetRoleOpen}
        target={targetPegawai}
      />

      {/* Dialog Cabut Role */}
      <RevokeRoleDialog
        open={revokeRoleOpen}
        onOpenChange={setRevokeRoleOpen}
        target={targetPegawai}
      />
    </div>
  );
}
