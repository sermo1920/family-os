@AGENTS.md

# Family OS

Application familiale de nutrition/menus/recettes/courses. Next.js App Router + TypeScript,
Vercel + Supabase (Postgres + Auth), Prisma, Tailwind + shadcn/ui.

## Conventions

- UI en français, code (variables, commentaires, commits) en anglais.
- Package manager : npm uniquement.
- Autorisation appliquée dans la couche serveur (helper `assertHouseholdAccess` dans `lib/auth.ts`),
  pas via Row Level Security Postgres en V1. Toute requête Prisma doit être filtrée par
  `householdId`.
- Cache Components (`cacheComponents: true`) volontairement désactivé : l'app est quasi
  entièrement dynamique/authentifiée, le modèle classique (`revalidatePath`) suffit.
- Organisation par domaine métier dans `features/<domaine>/` (schema.ts, queries.ts, actions.ts,
  components/, logique pure isolée avec son .test.ts), pas par couche technique.
- Tests : Vitest (fonctions pures), React Testing Library (composants), Playwright (e2e) —
  introduits progressivement, voir la feuille de route par phases.
