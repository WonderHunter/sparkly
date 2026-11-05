"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead() {
  await requireViewer();
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read");
  revalidatePath("/", "layout");
}
