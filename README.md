# Family OS

Application familiale (Next.js + Supabase + Prisma) : recettes, planning des repas, listes
de courses, préférences, stock — et un **assistant IA** (coordinateur + agent cuisine) qui
pilote ces fonctions en langage naturel.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npx prisma migrate deploy    # applique les migrations sur la base DIRECT_URL
npm run dev
```

Ouvrir http://localhost:3000, créer un compte (confirmation par e-mail Supabase), puis aller
sur **Assistant**.

### Variables d'environnement (`.env.local`, et Vercel → Project Settings → Environment Variables)

| Variable                                                           | Rôle                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auth Supabase                                                   |
| `DATABASE_URL`                                                     | Postgres (pooler transaction, port 6543) utilisé par l'app      |
| `DIRECT_URL`                                                       | Postgres (pooler session, port 5432) utilisé par les migrations |
| `ANTHROPIC_API_KEY`                                                | Clé API Anthropic pour l'assistant (serveur uniquement)         |
| `AI_MODEL`                                                         | Optionnel, défaut `claude-opus-5-5`                             |

Sans `ANTHROPIC_API_KEY`, l'assistant affiche comment la configurer ; tout le reste fonctionne.
Il n'y a pas de mode démonstration : aucune réponse n'est simulée.

## Assistant IA

- **Coordinateur** (`features/assistant/`) : interlocuteur unique. Il comprend la demande,
  résout les références (« celui de jeudi » → date et créneau), délègue au spécialiste et
  rédige la réponse. Ses seuls outils sont « déléguer à X » (2 délégations max par message).
- **Agent cuisine** (`features/cooking-agent/`) : 19 outils métier (recettes, menu, courses,
  préférences, stock). Les calculs (portions, unités, agrégation, stock) et les écritures en
  base sont du code déterministe (`features/*/service.ts`, fonctions pures testées).
- Chaque écriture est consignée dans un **journal d'actions** affiché sous la réponse :
  ce qui est « proposé (à valider) », « enregistré » ou non fait ne dépend pas du texte du modèle.
- Ajouter un agent (Garmin, finances, garde-robe) : l'implémenter dans son dossier et
  le brancher dans `features/assistant/specialists.ts`.

## Tests

```bash
npm test                 # Vitest : fonctions pures + composants
npm run test:integration # parcours complets contre un Postgres jetable (voir ci-dessous)
npm run test:e2e         # Playwright (auth)
```

`test:integration` exige `TEST_DATABASE_URL` pointant vers une base **jetable** (jamais
Supabase), migrée au préalable :

```bash
DIRECT_URL=postgresql://postgres@localhost:5432/familyos_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/familyos_test npm run test:integration
```

Le modèle IA y est remplacé par un client scripté (`tests/helpers/fake-llm.ts`) : aucune clé
n'est nécessaire et ces tests tournent en CI.
