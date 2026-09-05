import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { assertHouseholdAccess } from "@/lib/auth";
import { getLatestGoal } from "@/features/nutrition-goals/queries";
import { GoalPanel } from "@/features/nutrition-goals/components/goal-panel";
import { ProfileForm } from "@/features/household/components/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NutritionGoalsPage({
  params,
}: PageProps<"/nutrition-goals/[memberId]">) {
  const { memberId } = await params;

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) notFound();

  await assertHouseholdAccess(member.householdId);

  const latestGoal = await getLatestGoal(memberId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Objectifs nutritionnels — {member.displayName}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Nécessaire pour calculer le métabolisme de base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            memberId={member.id}
            displayName={member.displayName}
            dateOfBirth={member.dateOfBirth}
            sex={member.sex}
            heightCm={member.heightCm}
            weightKg={member.weightKg}
            activityLevel={member.activityLevel}
          />
        </CardContent>
      </Card>

      <GoalPanel memberId={member.id} current={latestGoal} />
    </div>
  );
}
