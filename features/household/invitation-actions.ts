"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitationSchema } from "@/features/auth/schema";
import { isInvitationValid } from "@/features/household/invitation-queries";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInvitationResult =
  { ok: true; link: string } | { ok: false; error: string };

/**
 * Génère (ou renouvelle) un lien d'invitation pour un membre du foyer sans
 * compte. Le lien n'est jamais envoyé automatiquement : le propriétaire le
 * copie et le partage lui-même (e-mail, SMS, WhatsApp...).
 */
export async function createInvitation(
  memberId: string,
): Promise<CreateInvitationResult> {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    include: { invitation: true },
  });
  const currentMember = await assertHouseholdAccess(member.householdId);

  if (currentMember.role !== "OWNER") {
    return {
      ok: false,
      error: "Seul le propriétaire du foyer peut inviter des membres.",
    };
  }
  if (member.linkedUserId) {
    return { ok: false, error: "Ce membre a déjà son propre compte." };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  if (member.invitation) {
    await prisma.householdInvitation.update({
      where: { memberId },
      data: { token, expiresAt, acceptedAt: null },
    });
  } else {
    await prisma.householdInvitation.create({
      data: { householdId: member.householdId, memberId, token, expiresAt },
    });
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  revalidatePath("/household");
  return { ok: true, link: `${protocol}://${host}/invite/${token}` };
}

export type AcceptInvitationState = { error: string | null; success?: boolean };

/**
 * Appelée depuis la page publique /invite/[token] (pas de session requise) :
 * crée le compte Supabase Auth de l'invité·e, avec le token en métadonnée
 * pour que getOrCreateCurrentMember() le rattache ensuite au bon membre/foyer
 * au lieu de lui créer un nouveau foyer.
 */
export async function acceptInvitation(
  token: string,
  _prevState: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const parsed = acceptInvitationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const invitation = await prisma.householdInvitation.findUnique({
    where: { token },
  });
  if (!isInvitationValid(invitation)) {
    return { error: "Cette invitation n'est plus valide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { invite_token: token } },
  });

  if (error) return { error: error.message };
  return { error: null, success: true };
}
