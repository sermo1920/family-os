import { redirect } from "next/navigation";
import { getOrCreateCurrentMember } from "@/lib/auth";

export default async function Home() {
  await getOrCreateCurrentMember();
  redirect("/household");
}
