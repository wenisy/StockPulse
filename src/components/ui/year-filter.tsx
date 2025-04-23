"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import * as React from "react";

export type YearOption = {
  label: string;
  value: string;
};

interface YearFilterProps {
  options: YearOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function YearFilter({
  options,
  selected,
  onChange,
  className,
  placeholder = "选择年份...",
  ...props
}: YearFilterProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (option: string) => {
    onChange(selected.filter((s) => s !== option));
  };

  const handleSelect = React.useCallback((option: string) => {
    const isSelected = selected.includes(option);
    if (isSelected) {
      // 如果已经选中，则取消选中
      onChange(selected.filter((s) => s !== option));
    } else {
      // 如果选择了特定年份，确保不包含'all'
      const newSelected = [...selected.filter(s => s !== 'all'), option];
      onChange(newSelected);
    }
    // 不要在选择后立即关闭弹出框，允许多选
  }, [selected, onChange]);

  const handleSelectAll = React.useCallback(() => {
    // 如果已经选中了'all'，则清空选择
    if (selected.includes('all')) {
      onChange([]);
    } else {
      // 否则选择'all'
      onChange(['all']);
    }
    // 不要在选择后立即关闭弹出框
  }, [selected, onChange]);

  return (
    <div className={cn("relative w-full", className)} {...props}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            type="button"
          >
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {selected.length > 0 ? (
                selected.length === options.length - 1 || selected.includes('all') ? (
                  <span>全部年份</span>
                ) : (
                  selected.map((selectedValue) => {
                    const option = options.find((o) => o.value === selectedValue);
                    return (
                      <Badge
                        key={selectedValue}
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {option?.label}
                        <button
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUnselect(selectedValue);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnselect(selectedValue);
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    );
                  })
                )
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-md border"
            align="start"
            sideOffset={5}
          >
            <div className="max-h-[300px] overflow-auto p-1">
              <div
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAll();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectAll();
                  }
                }}
              >
                <div
                  className={cn(
                    "border rounded-sm w-4 h-4 flex items-center justify-center mr-2",
                    (selected.includes('all') || (options.length > 1 && selected.length === options.length - 1))
                      ? "bg-primary border-primary text-primary-foreground"
                      : "opacity-50"
                  )}
                >
                  {(selected.includes('all') || (options.length > 1 && selected.length === options.length - 1)) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span>全部年份</span>
              </div>
              {options.filter(opt => opt.value !== 'all').map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "border rounded-sm w-4 h-4 flex items-center justify-center mr-2",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "opacity-50"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value);
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span
                      className="flex-grow"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value);
                      }}
                    >{option.label}</span>
                  </div>
                );
              })}

            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
