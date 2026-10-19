import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/misc";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireStaff();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Administration</h1>
        <Badge tone="spark">{ROLE_LABEL[viewer.profile.role]}</Badge>
      </div>
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <AdminNav isAdmin={viewer.isAdmin} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
