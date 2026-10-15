# CAXE

Plateforme web d'auto-audit d'entreprise par abonnement. Le contexte complet
du produit (architecture, règles de scoring, charte graphique, ton) est dans
[`CLAUDE.md`](./CLAUDE.md) — à lire avant toute modification.

## Stack

Next.js (TypeScript, App Router) · PostgreSQL · Prisma · Auth.js (NextAuth v5,
identifiants email/mot de passe) · Tailwind CSS.

## Démarrer en local

1. Avoir une base PostgreSQL disponible et copier `.env.example` vers `.env`
   en adaptant `DATABASE_URL` et `AUTH_SECRET`.
2. Installer les dépendances et appliquer les migrations :

   ```bash
   npm install
   npx prisma migrate dev
   ```

3. Lancer le serveur de développement :

   ```bash
   npm run dev
   ```

   L'application est servie sur http://localhost:3000.

## État actuel

- Inscription et compte (les sept champs de profil, authentification,
  persistance) : fait.
- Questionnaire, moteur de scoring, rapport, plan d'action : à construire
  (voir `CLAUDE.md` section 9).

Un seul métier est actif à l'inscription pour l'instant : agence immobilière
indépendante, activité transaction (`src/lib/metiers.ts`).
