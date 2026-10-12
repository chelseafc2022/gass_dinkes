"use client";
import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Inbox } from "lucide-react";
export function DataTable({
  data,
  columns,
}: {
  data: any[];
  columns: ColumnDef<any, any>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // TanStack Table manages its own state; do not memoize this API with React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((g) => (
            <TableRow key={g.id} className="bg-muted/45">
              {g.headers.map((h) => (
                <TableHead key={h.id} className="text-[11px] h-12 px-4">
                  <button
                    disabled={!h.column.getCanSort()}
                    onClick={h.column.getToggleSortingHandler()}
                    className="flex items-center gap-2 text-left"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getCanSort() && (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((c) => (
                  <TableCell
                    key={c.id}
                    className="text-xs px-4 py-4 max-w-md whitespace-normal"
                  >
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-52 text-center">
                <Inbox className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Belum ada data</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Tambahkan data atau ubah filter pencarian.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
