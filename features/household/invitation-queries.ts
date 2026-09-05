import { prisma } from "@/lib/db";

export async function getInvitationByToken(token: string) {
  return prisma.householdInvitation.findUnique({
    where: { token },
    include: { household: true, member: true },
  });
}

export function isInvitationValid<
  T extends { acceptedAt: Date | null; expiresAt: Date },
>(invitation: T | null | undefined): invitation is T {
  if (!invitation) return false;
  if (invitation.acceptedAt) return false;
  return invitation.expiresAt.getTime() > Date.now();
}
