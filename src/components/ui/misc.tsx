import Image from "next/image";
import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

type BadgeTone = "neutral" | "spark" | "success" | "warning" | "danger" | "ink";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted",
  spark: "bg-spark-soft text-spark-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  ink: "bg-ink text-ink-foreground",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

const AVATAR_SIZES = { sm: 32, md: 44, lg: 88, xl: 120 } as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const px = AVATAR_SIZES[size];
  const base = cn("relative shrink-0 overflow-hidden rounded-full bg-spark-soft", className);
  if (src) {
    return (
      <span className={base} style={{ width: px, height: px }}>
        <Image src={src} alt={name} fill sizes={`${px}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(base, "flex items-center justify-center font-bold text-spark-strong")}
      style={{ width: px, height: px, fontSize: px * 0.36 }}
      aria-label={name}
      role="img"
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "spark",
  size = "md",
  label,
}: {
  value: number;
  tone?: "spark" | "ink" | "success";
  size?: "sm" | "md" | "lg";
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill = { spark: "bg-spark", ink: "bg-ink", success: "bg-success" }[tone];
  const height = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("w-full overflow-hidden rounded-full bg-surface-muted", height)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700", fill)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-surface", className)}>{children}</div>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <SparkMark className="mb-4 h-10 w-10 text-spark/70" />
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** L'étincelle Sparkly (icône originale). */
export function SparkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 2c.7 6.6 3.4 9.3 10 10-6.6.7-9.3 3.4-10 10-.7-6.6-3.4-9.3-10-10 6.6-.7 9.3-3.4 10-10Z"
        fill="currentColor"
      />
      <path d="M26 20c.3 2.6 1.4 3.7 4 4-2.6.3-3.7 1.4-4 4-.3-2.6-1.4-3.7-4-4 2.6-.3 3.7-1.4 4-4Z" fill="var(--ember)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display text-xl font-extrabold tracking-tight", className)}>
      <SparkMark className="h-6 w-6 text-spark" />
      Sparkly
    </span>
  );
}
