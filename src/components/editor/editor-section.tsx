import type { ReactNode } from "react";

export function EditorSection({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold">{title}</h2>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
