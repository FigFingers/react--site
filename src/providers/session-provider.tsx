// src/providers/session-provider.tsx

"use client";

import type { Session } from "next-auth";
import { SessionProvider as NextAuthProvider } from "next-auth/react";
import type React from "react";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <NextAuthProvider session={session}>{children}</NextAuthProvider>;
}
