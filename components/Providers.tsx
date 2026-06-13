"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { ToastProvider } from "./Toast";
import { signIn as mirrorToLocal } from "@/lib/auth";

// Mirrors a real OAuth session into the existing localStorage client session,
// so every component that already reads getUser()/useUser() keeps working
// without change once Google/GitHub sign-in is live.
function SessionSync() {
  const { data } = useSession();
  useEffect(() => {
    const u = data?.user;
    if (u?.email) {
      mirrorToLocal({ name: u.name ?? u.email.split("@")[0], email: u.email });
    }
  }, [data]);
  return null;
}

export default function Providers({
  children,
  authEnabled,
}: {
  children: React.ReactNode;
  authEnabled: boolean;
}) {
  // Without configured OAuth there is no session endpoint to talk to, so skip
  // SessionProvider entirely — this keeps demo mode free of auth errors.
  if (!authEnabled) {
    return <ToastProvider>{children}</ToastProvider>;
  }
  return (
    <SessionProvider>
      <SessionSync />
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
