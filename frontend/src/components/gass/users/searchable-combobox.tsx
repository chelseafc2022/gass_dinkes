"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  id: string;
  label: string;
}

interface SearchableComboboxProps {
  id?: string;
  value: string;
  onValueChange: (val: string) => void;
  items: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SearchableCombobox({
  id,
  value,
  onValueChange,
  items,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Ketik untuk mencari...",
  emptyText = "Tidak ditemukan data.",
  allLabel = "-- Semua --",
  icon,
  disabled = false,
  className,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedItem = items.find((item) => String(item.id) === String(value));
  const displayLabel =
    value === "all" ? allLabel : selectedItem?.label || placeholder;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full min-w-0 max-w-full shrink justify-between overflow-hidden bg-background px-2.5 text-xs font-normal transition-colors hover:bg-accent/40 border-input",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left">
              {icon}
              <span
                className={cn(
                  "block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
                  value === "all"
                    ? "text-muted-foreground font-medium"
                    : "text-foreground font-medium",
                )}
                title={displayLabel}
              >
                {displayLabel}
              </span>
            </div>
            <div className="ml-1 flex shrink-0 items-center gap-1">
              {value !== "all" && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onValueChange("all");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onValueChange("all");
                    }
                  }}
                  className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Hapus pilihan"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="min-w-0 max-w-[calc(100vw-2rem)] p-0 shadow-lg border-border/80 overflow-hidden"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          align="start"
        >
        <Command
          filter={(itemValue, search) => {
            if (!search) return 1;
            return itemValue.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 text-xs"
            autoFocus
          />
          <CommandList className="max-h-64 overflow-y-auto overflow-x-hidden p-1">
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`-- ${allLabel} -- all semua`}
                onSelect={() => {
                  onValueChange("all");
                  setOpen(false);
                }}
                className="text-xs cursor-pointer font-medium py-2 px-2.5 flex items-start gap-2"
              >
                <Check
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    value === "all"
                      ? "opacity-100 text-emerald-600"
                      : "opacity-0",
                  )}
                />
                <span className="flex-1 min-w-0 line-clamp-3 whitespace-normal leading-snug break-words text-left">
                  {allLabel}
                </span>
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.id}`}
                  onSelect={() => {
                    onValueChange(item.id);
                    setOpen(false);
                  }}
                  className="text-xs cursor-pointer py-2 px-2.5 flex items-start gap-2"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      value === item.id
                        ? "opacity-100 text-emerald-600"
                        : "opacity-0",
                    )}
                  />
                  <span
                    className="flex-1 min-w-0 line-clamp-3 whitespace-normal leading-snug break-words text-left"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
