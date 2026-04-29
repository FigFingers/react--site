import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClipList from "@/app/base/clip/clipCluster";

export default async function MyVideoPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return (
    <ClipList
      clipApiUrl={`/api/search?user=${encodeURIComponent(userId)}`}
      userId={userId}
    />
  );
}
