import { getOrCreateCurrentMember } from "@/lib/auth";
import { getHouseholdWithMembers } from "@/features/household/queries";
import { MemberRow } from "@/features/household/components/member-row";
import { AddMemberToggle } from "@/features/household/components/add-member-toggle";

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
          <MemberRow key={m.id} member={m} />
        ))}
      </ul>

      <AddMemberToggle householdId={household.id} />
    </div>
  );
}
