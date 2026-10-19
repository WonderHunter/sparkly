"use client";

import { useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  /** Texte secondaire affiché sous le libellé dans la liste. */
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

// Radix n'accepte pas "" comme valeur d'option : on la remplace en interne.
const EMPTY = "__sparkly_empty__";
const toRadix = (v: string | undefined) => (v === "" ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? "" : v);

/**
 * Menu déroulant Sparkly (remplace le <select> natif du navigateur).
 * Accessible (rôles combobox/listbox, clavier, recherche par frappe) et
 * compatible avec les formulaires classiques grâce à un champ caché.
 */
export function Select({
  id,
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Choisir…",
  disabled,
  required,
  className,
  ...aria
}: SelectProps) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? internal;

  function handleChange(next: string) {
    const v = fromRadix(next);
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={current} />}
      <RadixSelect.Root value={toRadix(current)} onValueChange={handleChange} disabled={disabled} required={required}>
        <RadixSelect.Trigger
          id={id}
          aria-label={aria["aria-label"]}
          aria-describedby={aria["aria-describedby"]}
          aria-invalid={aria["aria-invalid"]}
          className={cn(
            "group flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 text-left text-[15px]",
            "transition-colors hover:border-foreground/30 focus:border-spark focus:outline-none focus:ring-3 focus:ring-spark/15",
            "data-[state=open]:border-spark data-[state=open]:ring-3 data-[state=open]:ring-spark/15",
            "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger",
            className,
          )}
        >
          <span className="truncate">
            <RadixSelect.Value placeholder={<span className="text-muted/70">{placeholder}</span>} />
          </span>
          <RadixSelect.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              "z-50 max-h-[min(22rem,var(--radix-select-content-available-height))] w-max min-w-[max(var(--radix-select-trigger-width),11rem)] max-w-[min(22rem,90vw)] overflow-hidden",
              "rounded-2xl border border-border bg-surface shadow-xl shadow-ink/10",
              "data-[state=open]:animate-[sparkly-pop_140ms_ease-out]",
            )}
          >
            <RadixSelect.ScrollUpButton className="flex h-7 items-center justify-center text-muted">
              <ChevronUp className="h-4 w-4" />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="p-1.5">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={toRadix(option.value)!}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex cursor-pointer items-center rounded-xl py-2 pr-3 pl-9 text-sm whitespace-nowrap outline-none select-none",
                    "data-[highlighted]:bg-spark-soft data-[highlighted]:text-spark-strong",
                    "data-[state=checked]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                  )}
                >
                  <RadixSelect.ItemIndicator className="absolute left-3 inline-flex items-center text-spark">
                    <Check className="h-4 w-4" />
                  </RadixSelect.ItemIndicator>
                  <div className="min-w-0">
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    {option.hint && <p className="truncate text-xs font-normal text-muted">{option.hint}</p>}
                  </div>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex h-7 items-center justify-center text-muted">
              <ChevronDown className="h-4 w-4" />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </>
  );
}
