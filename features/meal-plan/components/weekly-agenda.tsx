import {
  calendarDateKey,
  formatEventTime,
  type MemberCalendarResult,
} from "@/features/household/calendar";

const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

interface DayEvent {
  memberName: string;
  title: string;
  start: Date;
  isFullDay: boolean;
}

export function WeeklyAgenda({
  days,
  members,
  calendars,
}: {
  days: Date[];
  members: { id: string; displayName: string }[];
  calendars: MemberCalendarResult[];
}) {
  if (calendars.length === 0) return null;

  const memberNameById = new Map(members.map((m) => [m.id, m.displayName]));
  const failedMembers = calendars
    .filter((calendar) => calendar.error)
    .map((calendar) => memberNameById.get(calendar.memberId) ?? "?");

  const eventsByDay = new Map<string, DayEvent[]>();
  for (const calendar of calendars) {
    const memberName = memberNameById.get(calendar.memberId) ?? "?";
    for (const event of calendar.events) {
      const key = calendarDateKey(event.start);
      const list = eventsByDay.get(key) ?? [];
      list.push({
        memberName,
        title: event.title,
        start: event.start,
        isFullDay: event.isFullDay,
      });
      eventsByDay.set(key, list);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Agenda de la semaine</h2>
      {failedMembers.length > 0 && (
        <p className="text-destructive text-xs">
          Calendrier indisponible pour {failedMembers.join(", ")}.
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((day) => {
          const key = calendarDateKey(day);
          const events = (eventsByDay.get(key) ?? []).sort(
            (a, b) => a.start.getTime() - b.start.getTime(),
          );
          return (
            <div
              key={key}
              className="flex flex-col gap-1 rounded-md border p-2"
            >
              <p className="text-muted-foreground text-xs font-medium capitalize">
                {dayLabelFormatter.format(day)}
              </p>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-xs">—</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {events.map((event, index) => (
                    <li key={index} className="text-xs">
                      <span className="font-medium">
                        {event.isFullDay
                          ? "Jour entier"
                          : formatEventTime(event.start)}
                      </span>{" "}
                      · {event.memberName} — {event.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
