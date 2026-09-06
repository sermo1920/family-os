import { calendarDateKey } from "@/features/household/calendar";
import { colorDotClass } from "@/features/household/colors";
import { toDateKey } from "@/features/meal-plan/dates";
import type { MemberCalendarResult } from "@/features/household/calendar";
import type { MemberColor } from "@/lib/generated/prisma/client";

interface DayEvent {
  id: string;
  title: string;
  colorClass: string;
}

/**
 * Ligne "Rendez-vous" (pas de wrapper <div grid> à elle : rendue à l'intérieur
 * de la grille de WeekGrid via sa prop `agendaRow`, pour que ses colonnes de
 * jour soient pixel-alignées avec celles du planning repas juste en dessous).
 */
export function WeeklyAgendaRow({
  days,
  members,
  calendars,
}: {
  days: Date[];
  members: { id: string; displayName: string; color: MemberColor | null }[];
  calendars: MemberCalendarResult[];
}) {
  const memberById = new Map(members.map((m) => [m.id, m]));

  const eventsByDay = new Map<string, DayEvent[]>();
  for (const calendar of calendars) {
    const colorClass = colorDotClass(
      memberById.get(calendar.memberId)?.color ?? null,
    );
    for (const event of calendar.events) {
      const key = calendarDateKey(event.start);
      const list = eventsByDay.get(key) ?? [];
      list.push({ id: event.id, title: event.title, colorClass });
      eventsByDay.set(key, list);
    }
  }

  return (
    <>
      <div className="text-muted-foreground flex items-center text-sm">
        Rendez-vous
      </div>
      {days.map((day) => {
        const events = eventsByDay.get(calendarDateKey(day)) ?? [];
        return (
          <div
            key={toDateKey(day)}
            className="flex flex-col gap-1 rounded-md border p-2"
          >
            {events.length === 0 ? (
              <span className="text-muted-foreground text-xs">—</span>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${event.colorClass}`}
                  />
                  <span className="truncate">{event.title}</span>
                </div>
              ))
            )}
          </div>
        );
      })}
    </>
  );
}

/** Message d'erreur (calendriers en échec), affiché au-dessus de la grille —
 * séparé de la ligne elle-même puisqu'il n'a pas sa place dans une colonne. */
export function CalendarErrors({
  members,
  calendars,
}: {
  members: { id: string; displayName: string }[];
  calendars: MemberCalendarResult[];
}) {
  const memberNameById = new Map(members.map((m) => [m.id, m.displayName]));
  const failedNames = calendars
    .filter((calendar) => calendar.error)
    .map((calendar) => memberNameById.get(calendar.memberId) ?? "?");

  if (failedNames.length === 0) return null;

  return (
    <p className="text-destructive text-xs">
      Calendrier indisponible pour {failedNames.join(", ")}.
    </p>
  );
}
