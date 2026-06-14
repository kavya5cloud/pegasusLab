"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Analytics only runs in the browser and only in production.
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production") return;

    import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
      import("@/lib/firebase").then(({ app }) => {
        const analytics = getAnalytics(app);
        const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
        logEvent(analytics, "page_view", { page_path: url });
      });
    });
  }, [pathname, searchParams]);

  return null;
}
