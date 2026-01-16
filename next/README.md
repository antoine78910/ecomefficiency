## Configuration des Variables d'Environnement

Créer un fichier `.env.local` à la racine du projet avec les variables suivantes (ne pas commiter ce fichier):

### Configuration Vercel (Domaines Partenaires)

**IMPORTANT**: Tous les domaines personnalisés des partenaires sont ajoutés au projet Vercel **ecomefficiency**. Cela permet de centraliser tous les domaines dans un seul projet Vercel et d'éviter les problèmes de gestion multi-projets.

```bash
# ID du projet Vercel "ecomefficiency" - TOUS les domaines partenaires seront ajoutés à ce projet
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx
VERCEL_TOKEN=your-vercel-token
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx
```

### Configuration Resend (Domaines Email)

Les domaines email des partenaires (ex: notify.partner-domain.com) sont configurés automatiquement dans Resend.

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

### Bot Discord → Mise à jour des identifiants

```bash
DISCORD_BOT_TOKEN=xxx
DISCORD_GUILD_ID=1221893988756226099
DISCORD_CHANNEL_ID=1262357372970467451
CREDENTIALS_POST_URL=http://localhost:5000/api/credentials
CREDENTIALS_SECRET=un_secret_a_toi
```

L'API `/api/credentials` accepte un header optionnel `Authorization: Bearer <CREDENTIALS_SECRET>` pour sécuriser la mise à jour.

### Autres Variables

Voir le fichier `.env.example` pour la liste complète des variables d'environnement nécessaires.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
