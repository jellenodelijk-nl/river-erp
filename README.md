# River ERP

Intern CRM/ERP systeem voor **River Digital** en **River Software**.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + TOTP 2FA
- **Charts**: Recharts
- **Animaties**: Framer Motion
- **Iconen**: Lucide React
- **Drag & Drop**: dnd-kit

## Setup

### 1. Clone & installeer

```bash
git clone https://github.com/jellenodelijk-nl/river-erp.git
cd river-erp
npm install
```

### 2. Supabase

1. Maak een nieuw Supabase project aan
2. Voer de SQL migration uit: `supabase/migrations/001_initial_schema.sql`
3. Kopieer de project URL en keys

### 3. Environment variables

```bash
cp .env.example .env.local
```

Vul de waarden in:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `MONEYBIRD_API_TOKEN` — Moneybird API token
- `MONEYBIRD_ADMINISTRATION_ID` — Moneybird administratie ID

### 4. Eerste admin gebruiker

Maak handmatig een gebruiker aan in Supabase Auth, en voeg een record toe in de `users` tabel met `role = 'admin'`.

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Modules

| Module | Route | Beschrijving |
|--------|-------|-------------|
| Dashboard | `/` | Overzicht metrics, recente leads, taken |
| Campagne leads | `/campagne-leads` | Kanban + lijst, drag-and-drop fases |
| Sales leads | `/sales-leads` | Kanban + lijst, omzetten naar klant |
| Klanten | `/klanten` | Klantenbeheer, opdrachten, Moneybird facturen |
| Taken | `/taken` | Taakbeheer met filters en inline status |
| Financiën | `/financien` | Moneybird facturatieoverzicht |
| Analyse | `/analyse` | Grafieken en statistieken (Recharts) |
| Gebruikers | `/gebruikers` | Admin: gebruikersbeheer + uitnodigen |
| Instellingen | `/instellingen` | Profielinstellingen |

## Deployment (Vercel)

1. Push naar GitHub
2. Importeer in Vercel
3. Voeg environment variables toe
4. Deploy
