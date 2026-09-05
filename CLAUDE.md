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
  introduits progressivement, voir la feuille de route par phases. Tests composants : ajouter
  `// @vitest-environment jsdom` en tête de fichier (garde les tests de fonctions pures rapides,
  en environnement `node` par défaut, cf. `vitest.config.mts`).
- Catalogue d'ingrédients : `IngredientCategory` est un enum Prisma fixe (pas une table séparée
  avec son propre CRUD) — simplification volontaire par rapport au plan initial, suffisant pour
  grouper la liste de courses en Phase 5 sans complexité inutile.
- Planning (`PlannedMeal`) : dates stockées en minuit UTC (jour seul, l'heure n'est pas utilisée) —
  voir `features/meal-plan/dates.ts` (testé) pour tout calcul de semaine/jour, ne pas manipuler les
  dates à la main ailleurs. `useOptimistic` n'est utilisé que pour le retrait d'un repas (clic
  unique, gain UX net) ; l'assignation garde `useActionState` classique (formulaire multi-champs,
  le `pending` suffit).
- Liste de courses (`ShoppingList`/`ShoppingListItem`) : pas de champ `status` (DRAFT/ACTIVE/
  ARCHIVED) contrairement au plan initial — simplification volontaire, une liste existe ou est
  supprimée. `ShoppingListItem.name` est toujours copié à la création (agrégation ou saisie
  manuelle) plutôt que de dépendre d'une relation vers `Ingredient` : l'affichage ne casse jamais
  si l'ingrédient source est renommé/supprimé ensuite (`onDelete: SetNull` sur la relation).
  L'agrégation (`features/shopping-list/aggregate.ts`) est une fonction pure testée : deux recettes
  partageant un ingrédient doivent donner une seule ligne sommée.

## Playwright (e2e)

- Premiers tests dans `e2e/auth.spec.ts` : redirection non-authentifié, validation du formulaire
  d'inscription, erreur de connexion invalide. Volontairement scopés à ce qui ne nécessite PAS de
  compte Supabase préconfirmé (la confirmation email est activée, cf. section Auth) : créer un vrai
  compte de test demanderait la clé secrète Supabase (admin), qu'on ne veut pas manipuler dans une
  suite de tests locale pour l'instant.
- Un test couvrant le vrai flux complet (inscription → planning → génération de liste → coche d'un
  article) est un bon candidat futur, une fois un utilisateur de test dédié provisionné via cette
  clé secrète.
- `npm run test:e2e` en local (lance son propre serveur `next dev` via `webServer` dans
  `playwright.config.ts`). Pas encore branché dans la CI GitHub Actions (demanderait les secrets
  Supabase/DB là-bas) — `npm run test` (Vitest) reste le seul test qui tourne en CI pour l'instant.

## shadcn/ui sur Base UI (pas Radix)

- `<Select>` : pour que le déclencheur affiche le libellé choisi (pas la valeur brute genre
  "MALE"), il faut passer une prop `items` (`Record<value, label>`) au composant `Select` racine —
  voir `features/*/schema.ts` (`categoryLabels`, `unitLabels`, etc.) et leur usage dans les forms.
  Un `<Select>` accepte aussi plusieurs instances avec le même `name` dans un même formulaire
  (chacune pose son propre input caché) : utilisé dans le constructeur d'ingrédients de
  `RecipeForm`, lu côté serveur via `formData.getAll(name)`.
- `<Button>` n'a pas de prop `asChild` (convention Radix) : utiliser `render={<Link .../>}` pour
  qu'il rende un lien tout en gardant le style bouton.

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

## Auth (Supabase)

- Next.js 16 a renommé Middleware en **Proxy** : le fichier s'appelle `proxy.ts` à la racine
  (pas `middleware.ts`), exporte une fonction `proxy` (ou default export). Fonctionnement
  identique à l'ancien middleware.
- Pour vérifier une session côté serveur (Proxy, Server Components, Server Actions), utiliser
  `supabase.auth.getClaims()` (vérifie le JWT localement via JWKS, rapide) — PAS `getUser()`
  (fait un appel réseau à chaque fois) ni `getSession()` (non re-vérifié, jamais fiable côté
  serveur). C'est la recommandation actuelle de Supabase (a remplacé le vieux conseil
  "toujours utiliser getUser()").
- `lib/supabase/{client,server,proxy}.ts` suivent le pattern officiel Supabase SSR pour
  Next.js App Router (cookies via `@supabase/ssr`). `proxy.ts` (racine) délègue à
  `lib/supabase/proxy.ts` (`updateSession`).
- `lib/auth.ts` fait le pont entre l'utilisateur Supabase Auth et notre modèle métier :
  `getOrCreateCurrentMember()` crée automatiquement un foyer + un Member OWNER à la toute
  première visite authentifiée (pas de formulaire de création de foyer à l'inscription — le
  foyer est nommé "Mon foyer" par défaut, renommable ensuite). `assertHouseholdAccess(householdId)`
  est le garde-fou à utiliser dans toute Server Action/query touchant un foyer précis.
- Confirmation email activée par défaut sur les projets Supabase hébergés (comportement gardé
  tel quel, pas désactivé pour "simplifier" le dev) : après `signUp()`, l'utilisateur n'a pas de
  session tant qu'il n'a pas cliqué le lien reçu par mail.
- Piège vécu : à la création du premier Member (OWNER), lire `user_metadata.display_name` depuis
  les claims de `getClaims()` s'est révélé peu fiable (retombait sur l'e-mail comme nom affiché).
  `getOrCreateCurrentMember()` utilise donc `supabase.auth.getUser()` (un vrai appel réseau,
  acceptable ici car ce n'est exécuté qu'une seule fois par compte) pour lire `user_metadata` de
  façon fiable à ce moment précis. `Member.email` est un champ séparé, copié une fois depuis
  Supabase Auth, jamais utilisé comme `displayName` ni modifiable dans l'app (le vrai compte reste
  géré par Supabase).
- Suppression d'un membre (`deleteMember`) : refusée si `linkedUserId` est renseigné (un membre
  avec son propre compte de connexion n'est pas une simple fiche de foyer) — géré uniquement pour
  les membres sans compte (enfants, etc.). `NutritionGoal`/`MealAttendance` ont `onDelete: Cascade`
  côté `Member` pour que la suppression ne bute pas sur une contrainte de clé étrangère.

## Piège vécu : erreur Prisma "Can't reach database server at base"

Rencontré en déployant sur Vercel (fonctionnait en local avec les mêmes identifiants). Le message
`P1001 Can't reach database server at base` **n'indique PAS un vrai hostname "base"** — c'est un
texte générique/bugué de cette version de Prisma (`7.10.0` + `@prisma/adapter-pg`), pas dérivé de
`DATABASE_URL`. Deux pièges bien réels rencontrés en le débuggant, dans l'ordre :

1. Guillemets collés par erreur dans la valeur de la variable d'environnement Vercel (copiées
   depuis `.env.local`, où la valeur est entre guillemets pour la syntaxe du fichier) — cassait le
   parsing de l'URL (`new URL()` levait "Invalid URL"). Se vérifie en loggant `raw.length` et en
   comparant à la longueur attendue.
2. Une fois l'URL valide, une vraie erreur de connectivité réseau Vercel→Supabase transitoire a
   persisté un moment puis s'est résolue d'elle-même (nouveau déploiement / pooler Supabase qui
   récupère). Si ça revient : logguer `error.meta.driverAdapterError.cause` (pas exposé par défaut
   par Prisma) pour voir la vraie cause Node (ECONNREFUSED/ETIMEDOUT/etc.), ne pas se fier au
   message affiché.
