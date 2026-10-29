import { prisma } from "@/lib/db";
import type { PreferenceKind } from "@/lib/generated/prisma/client";

export async function listPreferences(householdId: string) {
  return prisma.householdPreference.findMany({
    where: { householdId },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });
}

/** Same text and kind twice is stored once (re-running a request is safe). */
export async function addPreference(
  householdId: string,
  kind: PreferenceKind,
  text: string,
) {
  const existing = await prisma.householdPreference.findFirst({
    where: {
      householdId,
      kind,
      text: { equals: text.trim(), mode: "insensitive" },
    },
  });
  if (existing) return { preference: existing, created: false };
  const preference = await prisma.householdPreference.create({
    data: { householdId, kind, text: text.trim() },
  });
  return { preference, created: true };
}

export async function updatePreference(
  householdId: string,
  preferenceId: string,
  data: { kind?: PreferenceKind; text?: string },
) {
  const existing = await prisma.householdPreference.findFirst({
    where: { id: preferenceId, householdId },
  });
  if (!existing) return null;
  return prisma.householdPreference.update({
    where: { id: preferenceId },
    data,
  });
}

export async function deletePreference(
  householdId: string,
  preferenceId: string,
) {
  const existing = await prisma.householdPreference.findFirst({
    where: { id: preferenceId, householdId },
  });
  if (!existing) return null;
  await prisma.householdPreference.delete({ where: { id: preferenceId } });
  return existing;
}

/**
 * Household composition for portion planning — names and adult/child only:
 * the cooking agent doesn't need e-mails, body measurements or calendars.
 */
export async function getHouseholdComposition(householdId: string) {
  const members = await prisma.member.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { displayName: true, role: true },
  });
  return {
    memberCount: members.length,
    members: members.map((m) => ({
      name: m.displayName,
      isChild: m.role === "CHILD",
    })),
  };
}
