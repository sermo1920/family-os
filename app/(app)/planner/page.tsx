import Link from "next/link";
import { getOrCreateCurrentMember } from "@/lib/auth";
import { getHouseholdWithMembers } from "@/features/household/queries";
import { listRecipes } from "@/features/recipes/queries";
import { getWeekPlan } from "@/features/meal-plan/queries";
import { getWeekStart, addDays, toDateKey } from "@/features/meal-plan/dates";
import { fetchMembersCalendars } from "@/features/household/calendar";
import { WeekGrid } from "@/features/meal-plan/components/week-grid";
import {
  WeeklyAgendaRow,
  CalendarErrors,
} from "@/features/meal-plan/components/weekly-agenda";
import { Button } from "@/components/ui/button";

const weekLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

export default async function PlannerPage({
  searchParams,
}: PageProps<"/planner">) {
  const { week } = await searchParams;
  const requestedWeek = typeof week === "string" ? new Date(week) : new Date();
  const weekStart = getWeekStart(
    Number.isNaN(requestedWeek.getTime()) ? new Date() : requestedWeek,
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const member = await getOrCreateCurrentMember();
  const [household, recipes, meals] = await Promise.all([
    getHouseholdWithMembers(member.householdId),
    listRecipes(member.householdId),
    getWeekPlan(member.householdId, weekStart),
  ]);
  const calendars = await fetchMembersCalendars(
    household.members,
    weekStart,
    addDays(weekStart, 7),
  );

  const previousWeek = toDateKey(addDays(weekStart, -7));
  const nextWeek = toDateKey(addDays(weekStart, 7));

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Semaine du {weekLabelFormatter.format(weekStart)}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/planner?week=${previousWeek}`} />}
          >
            ← Semaine précédente
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/planner?week=${nextWeek}`} />}
          >
            Semaine suivante →
          </Button>
        </div>
      </div>

      <CalendarErrors members={household.members} calendars={calendars} />

      {recipes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Crée d&apos;abord une recette pour pouvoir planifier des repas.
        </p>
      ) : (
        <WeekGrid
          householdId={member.householdId}
          days={days}
          initialMeals={meals}
          recipeOptions={recipes.map((r) => ({ id: r.id, name: r.name }))}
          memberOptions={household.members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
          }))}
          agendaRow={
            <WeeklyAgendaRow
              days={days}
              members={household.members}
              calendars={calendars}
            />
          }
        />
      )}
    </div>
  );
}
