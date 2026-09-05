import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/generated/prisma/client";

/** Utilisateur Supabase Auth actuel (claims du JWT), ou null si non connecté. */
export async function getAuthClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

/**
 * Renvoie le Member lié à l'utilisateur connecté. À la toute première visite
 * authentifiée (aucun Member ne pointe encore vers ce compte), crée un foyer
 * par défaut et son premier membre (OWNER) : on évite un formulaire de
 * création de foyer à l'inscription, le foyer pourra être renommé ensuite.
 */
export async function getOrCreateCurrentMember(): Promise<Member> {
  const claims = await getAuthClaims();
  if (!claims) redirect("/sign-in");

  const existing = await prisma.member.findUnique({
    where: { linkedUserId: claims.sub },
  });
  if (existing) return existing;

  // Première visite authentifiée seulement : on peut se permettre l'appel
  // réseau de getUser() ici (pas un chemin chaud) pour lire user_metadata de
  // façon fiable. Les claims décodés localement via getClaims() ne l'ont pas
  // toujours embarqué correctement, ce qui faisait retomber le nom affiché
  // sur l'e-mail — d'où aussi le champ `email` séparé ci-dessous, jamais
  // utilisé comme nom.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const rawDisplayName = (
    userData.user?.user_metadata as Record<string, unknown> | undefined
  )?.display_name as string | undefined;
  const email = userData.user?.email ?? claims.email ?? null;
  const displayName = rawDisplayName?.trim() || email?.split("@")[0] || "Moi";

  const household = await prisma.household.create({
    data: {
      name: "Mon foyer",
      members: {
        create: {
          linkedUserId: claims.sub,
          displayName,
          email,
          role: "OWNER",
        },
      },
    },
    include: { members: true },
  });

  return household.members[0];
}

/**
 * Vérifie que le membre actuellement connecté appartient bien au foyer
 * `householdId`. À appeler dans toute Server Action / requête qui lit ou
 * modifie des données rattachées à un foyer précis, pour ne jamais laisser
 * un utilisateur toucher aux données d'un autre foyer.
 */
export async function assertHouseholdAccess(
  householdId: string,
): Promise<Member> {
  const member = await getOrCreateCurrentMember();
  if (member.householdId !== householdId) {
    throw new Error(
      "Accès refusé : ce foyer ne correspond pas à l'utilisateur connecté.",
    );
  }
  return member;
}
