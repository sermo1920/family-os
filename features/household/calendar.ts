import ical, { type VEvent } from "node-ical";

const FETCH_TIMEOUT_MS = 8000;

// L'app ne gère pas de fuseau horaire par foyer (comme le reste des dates de
// l'app, volontairement simplifié pour un seul foyer) — on suppose la Suisse
// romande pour afficher/grouper par jour les horaires réels d'un calendrier
// externe correctement plutôt qu'en UTC brut.
const HOUSEHOLD_TIMEZONE = "Europe/Zurich";

/** Clé "aaaa-mm-jj" du jour calendaire d'une date, dans le fuseau du foyer. */
export function calendarDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOUSEHOLD_TIMEZONE,
  }).format(date);
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isFullDay: boolean;
}

export interface MemberCalendarResult {
  memberId: string;
  events: CalendarEvent[];
  error: string | null;
}

function eventTitle(summary: VEvent["summary"] | undefined): string {
  if (!summary) return "(sans titre)";
  return typeof summary === "string" ? summary : summary.val;
}

/** Récupère et parse un calendrier ICS distant, limité aux événements qui
 * chevauchent [rangeStart, rangeEnd] (les événements récurrents sont
 * développés dans cette plage via node-ical). */
export async function fetchCalendarEvents(
  icsUrl: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  // On passe par fetch() nous-mêmes (plutôt que ical.async.fromURL) pour
  // contrôler le timeout : le typage de fromURL fait perdre le retour
  // Promise dès qu'on lui passe des options en second argument.
  const response = await fetch(icsUrl, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Échec du chargement du calendrier (${response.status})`);
  }
  const data = await ical.async.parseICS(await response.text());

  const events: CalendarEvent[] = [];
  for (const component of Object.values(data)) {
    if (!component || component.type !== "VEVENT") continue;

    if (component.rrule) {
      const instances = ical.expandRecurringEvent(component, {
        from: rangeStart,
        to: rangeEnd,
      });
      for (const instance of instances) {
        events.push({
          id: `${component.uid}-${instance.start.toISOString()}`,
          title: eventTitle(instance.event.summary),
          start: instance.start,
          end: instance.end,
          isFullDay: instance.isFullDay,
        });
      }
      continue;
    }

    if (!component.end || component.end < rangeStart) continue;
    if (component.start > rangeEnd) continue;

    events.push({
      id: component.uid,
      title: eventTitle(component.summary),
      start: component.start,
      end: component.end,
      isFullDay: component.datetype === "date",
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Récupère le calendrier de chaque membre ayant configuré un
 * `icsCalendarUrl`, en parallèle. Un calendrier en erreur (URL invalide,
 * hôte injoignable, timeout) n'empêche jamais l'affichage des autres —
 * chaque membre a son propre résultat avec une éventuelle erreur dédiée.
 */
export async function fetchMembersCalendars(
  members: { id: string; icsCalendarUrl: string | null }[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<MemberCalendarResult[]> {
  const withCalendar = members.filter(
    (member): member is { id: string; icsCalendarUrl: string } =>
      !!member.icsCalendarUrl,
  );

  return Promise.all(
    withCalendar.map(async (member) => {
      try {
        const events = await fetchCalendarEvents(
          member.icsCalendarUrl,
          rangeStart,
          rangeEnd,
        );
        return { memberId: member.id, events, error: null };
      } catch {
        return {
          memberId: member.id,
          events: [],
          error: "Impossible de charger ce calendrier.",
        };
      }
    }),
  );
}
