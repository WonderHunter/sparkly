"use client";

import { useEffect } from "react";
import { CrashScreen } from "@/components/layout/error-screen";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <CrashScreen error={error} retry={retry} />;
}
