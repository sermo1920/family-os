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

  let existing;
  try {
    existing = await prisma.member.findUnique({
      where: { linkedUserId: claims.sub },
    });
  } catch (err) {
    // Diagnostic temporaire : la cause réelle d'une erreur de connexion
    // réseau (ETIMEDOUT, ECONNREFUSED, certificat...) n'est pas incluse dans
    // le message par défaut de Prisma. À retirer une fois résolu.
    const driverCause = (
      err as {
        meta?: { driverAdapterError?: { cause?: unknown } };
      }
    )?.meta?.driverAdapterError?.cause;
    console.log(
      `[lib/auth] findUnique failed, driverAdapterError.cause=${JSON.stringify(driverCause, Object.getOwnPropertyNames((driverCause as object) ?? {}))}`,
    );
    throw err;
  }
  if (existing) return existing;

  const displayName =
    ((claims.user_metadata as Record<string, unknown> | undefined)
      ?.display_name as string | undefined) ??
    claims.email ??
    "Moi";

  const household = await prisma.household.create({
    data: {
      name: "Mon foyer",
      members: {
        create: {
          linkedUserId: claims.sub,
          displayName,
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
