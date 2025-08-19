// src/app/(protected)/layout.js
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({ children }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  return <>{children}</>;
}
