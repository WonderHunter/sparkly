import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-foreground placeholder:text-muted/70 " +
  "transition-colors focus:border-spark focus:outline-none focus:ring-3 focus:ring-spark/15 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | string[];
  children: ReactNode;
  className?: string;
}

/** Libellé + contrôle + aide + erreur, liés pour l'accessibilité. */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint && !message && <p className="text-[13px] text-muted">{hint}</p>}
      {message && (
        <p id={`${htmlFor}-error`} className="text-[13px] font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "success"; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
      )}
    >
      {children}
    </p>
  );
}
