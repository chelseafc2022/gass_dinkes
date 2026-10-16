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
            "h-9 w-full justify-between bg-background text-xs font-normal px-2.5 hover:bg-accent/40 border-input transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <div className="flex items-center gap-1.5 truncate text-left">
            {icon}
            <span
              className={cn(
                "truncate",
                value === "all"
                  ? "text-muted-foreground font-medium"
                  : "text-foreground font-medium",
              )}
            >
              {displayLabel}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
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
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0 shadow-lg border-border/80"
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
          <CommandList className="max-h-64 overflow-y-auto p-1">
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
                className="text-xs cursor-pointer font-medium py-1.5"
              >
                <Check
                  className={cn(
                    "mr-2 h-3.5 w-3.5 shrink-0",
                    value === "all"
                      ? "opacity-100 text-emerald-600"
                      : "opacity-0",
                  )}
                />
                <span className="truncate">{allLabel}</span>
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.id}`}
                  onSelect={() => {
                    onValueChange(item.id);
                    setOpen(false);
                  }}
                  className="text-xs cursor-pointer py-1.5"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 shrink-0",
                      value === item.id
                        ? "opacity-100 text-emerald-600"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
