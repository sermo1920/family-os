import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { getHouseholdWithMembers } from "@/features/household/queries";
import { AddMemberForm } from "@/features/household/components/add-member-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  OWNER: "Propriétaire",
  ADULT: "Adulte",
  CHILD: "Enfant",
};

export default async function HouseholdPage() {
  const member = await getOrCreateCurrentMember();
  const household = await getHouseholdWithMembers(member.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{household.name}</h1>
        <p className="text-muted-foreground">
          {household.members.length} membre
          {household.members.length > 1 ? "s" : ""}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {household.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <span>{m.displayName}</span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">
                {roleLabels[m.role]}
              </span>
              <Link
                href={`/nutrition-goals/${m.id}`}
                className="text-sm underline"
              >
                Objectifs nutritionnels
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un membre</CardTitle>
          <CardDescription>
            Pour un enfant ou toute autre personne du foyer qui n&apos;a pas
            besoin de son propre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddMemberForm householdId={household.id} />
        </CardContent>
      </Card>
    </div>
  );
}
