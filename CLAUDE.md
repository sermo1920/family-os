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

## Prisma

- Version épinglée en dur sur `7.10.0` (client + CLI + adapter-pg). Ne PAS faire `npm i
  prisma@latest` sans vérifier d'abord : au moment d'écrire ceci, le tag `latest` sur npm pointe
  vers une release candidate `8.0.0-rc.x` qui embarque "Prisma Composer" (voir point suivant).
- On n'utilise PAS `@prisma/composer` / Prisma Cloud (plateforme de déploiement concurrente de
  Vercel, avec ses propres notions de services/modules/RPC). On reste sur le Prisma "classique" :
  `schema.prisma` + `prisma migrate` + `@prisma/client` + `@prisma/adapter-pg`, déployé via Vercel.
  Si `prisma init` ou une future mise à jour réinstalle des fichiers/skills liés à Composer,
  les supprimer.
- Fichier de config : `prisma7.config.ts` (nom versionné, auto-détecté par la CLI pour la
  branche majeure 7.x — ne pas renommer en `prisma.config.ts`). Il charge explicitement
  `.env.local` (la CLI Prisma ne le lit pas automatiquement) et pointe `datasource.url` vers
  `DIRECT_URL` (connexion session pooler, port 5432 — supporte les prepared statements requis par
  les migrations).
- Runtime applicatif (`lib/db.ts`) : `PrismaClient` + `PrismaPg` (adapter-pg) branché sur
  `DATABASE_URL` (transaction pooler, port 6543, suffixe `?pgbouncer=true`) — adapté au serverless
  de Vercel. Singleton via `globalThis` pour éviter d'épuiser les connexions au hot-reload.
- `postinstall: "prisma generate"` dans package.json est indispensable : le client généré
  (`lib/generated/prisma/`) est gitignoré, donc Vercel et la CI doivent le régénérer à chaque
  install. Vérifié : `prisma generate` fonctionne sans `DATABASE_URL`/`DIRECT_URL` présents (pas
  besoin de secrets DB dans la CI GitHub Actions).
- Différé (durcissement futur, même logique que le RLS) : créer un rôle Postgres dédié `prisma`
  (moins de privilèges que le `postgres` par défaut actuellement utilisé) via le SQL Editor
  Supabase, cf. guide "Connecting with Prisma" de Supabase.
- `npm audit` signale des vulnérabilités transitives dans les dépendances internes de la CLI
  Prisma (`deepmerge-ts`, `mysql2` via `@prisma/config`) : uniquement utilisées par l'outillage
  CLI local (jamais déployé), donc sans risque réel. Ne pas lancer `npm audit fix --force` pour
  ça (ça downgrade vers un `prisma` plus vieux).
