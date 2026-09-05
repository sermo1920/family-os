import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { listShoppingLists } from "@/features/shopping-list/queries";
import { GenerateForm } from "@/features/shopping-list/components/generate-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

export default async function ShoppingListsPage() {
  const member = await getOrCreateCurrentMember();
  const lists = await listShoppingLists(member.householdId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Listes de courses</h1>

      <ul className="flex flex-col gap-2">
        {lists.map((list) => (
          <li key={list.id}>
            <Link
              href={`/shopping-lists/${list.id}`}
              className="hover:bg-accent flex items-center justify-between rounded-md border px-4 py-3"
            >
              <span className="font-medium">{list.name}</span>
              <span className="text-muted-foreground text-sm">
                {dateFormatter.format(list.startDate)} –{" "}
                {dateFormatter.format(list.endDate)}
              </span>
            </Link>
          </li>
        ))}
        {lists.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucune liste de courses pour le moment.
          </p>
        )}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>Générer une liste</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateForm householdId={member.householdId} />
        </CardContent>
      </Card>
    </div>
  );
}
