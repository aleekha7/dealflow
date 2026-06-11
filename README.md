# DealFlow

The networking CRM for finance students breaking into investment banking, private equity, and venture capital. Track every contact, never miss a follow-up, and run your recruiting outreach like a deal process.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth) · Stripe subscriptions · Resend transactional email · Vercel (with Vercel Cron).

## Features

- **Contact management** — manual add or bulk CSV import; search and filter by name, firm, tier, and pipeline stage; color-coded firm tier badges
- **Outreach pipeline** — drag-and-drop kanban board with 8 stages from *Not Contacted* to *Closed*; cards show name, firm, tier, and days since last action
- **Email templates** — reusable templates with `{{first_name}}`, `{{firm}}`, `{{role}}`, `{{your_name}}`, `{{your_school}}` merge tags; 3 starter templates seeded on signup; compose with live preview per contact
- **Follow-up reminders** — per-contact reminder dates, "Due Today"/"Overdue" dashboard sections, overdue badge in the nav, and a daily digest email via Resend + Vercel Cron
- **Outreach log** — immutable timeline of every interaction per contact; the log drives "days since last action" via a DB trigger
- **Dashboard** — total contacts, emailed-this-week, reply rate, coffee chat counts, pipeline funnel chart, firm-tier donut (Recharts)
- **Billing** — 7-day free trial (no card), then a $15/month "DealFlow Pro" subscription via Stripe Checkout; webhook-driven status sync; Stripe Customer Portal for self-serve management; soft paywall on expiry/cancel/failed payment
- Dark mode, fully responsive, empty states everywhere, toast notifications for all actions

## Project structure

```
app/                  Pages & layouts (App Router)
  (app)/              Authenticated app (dashboard, contacts, pipeline, templates, billing, settings)
  api/                Route handlers (contacts, templates, log, profile, stripe, cron)
  auth/callback/      Supabase email-confirmation exchange
  login/, signup/     Auth pages
components/           UI (shadcn/ui primitives + feature components)
lib/                  Supabase/Stripe/Resend clients, validation, constants, helpers
supabase/migrations/  SQL schema, RLS policies, triggers
types/                Shared TypeScript types
middleware.ts         Session refresh, auth protection, subscription gating
vercel.json           Daily reminder cron (13:00 UTC)
```

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local   # then fill in every value (see below)
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration: open **SQL Editor** and paste the contents of `supabase/migrations/0001_init.sql` (or use `supabase db push` with the CLI). This creates all tables, enums, indexes, RLS policies, and the signup trigger that starts the 7-day trial and seeds the 3 starter templates.
3. Copy from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only; never expose)
4. **Auth settings** (Authentication → URL Configuration): set *Site URL* to your app URL and add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to the redirect allow-list.
   - If you keep "Confirm email" enabled, users get a confirmation link that lands on `/auth/callback`. Disable it for instant signup in dev if you prefer.

### 3. Stripe

1. In the [Stripe Dashboard](https://dashboard.stripe.com), create a **Product** named `DealFlow Pro` with a **recurring price of $15/month**. Copy the price ID (`price_...`) into `STRIPE_PRICE_ID`.
2. Copy your secret key (**Developers → API keys**) into `STRIPE_SECRET_KEY`.
3. **Webhook** (Developers → Webhooks → Add endpoint):
   - Endpoint URL: `https://<your-domain>/api/stripe/webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. Enable the **Customer Portal** (Settings → Billing → Customer portal) so users can cancel/update cards. Allow subscription cancellation at minimum.

**Local webhook testing:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# use the whsec_... it prints as STRIPE_WEBHOOK_SECRET in .env.local
```

### 4. Resend

1. Create an API key at [resend.com](https://resend.com) → `RESEND_API_KEY`.
2. Verify your sending domain and set `RESEND_FROM_EMAIL` (e.g. `DealFlow <reminders@yourdomain.com>`). Without it, the code falls back to Resend's `onboarding@resend.dev` sender, which only delivers to your own Resend account email — fine for dev, not production.

### 5. Cron secret

Set `CRON_SECRET` to any long random string (e.g. `openssl rand -hex 32`). When this env var is present in Vercel, Vercel Cron automatically sends it as `Authorization: Bearer <CRON_SECRET>` to `/api/cron/reminders`, and the route rejects anything else.

To trigger the digest manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/reminders
```

### 6. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Environment variables

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server-only) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint signing secret |
| `STRIPE_PRICE_ID` | Stripe → Products → DealFlow Pro → $15/mo price |
| `RESEND_API_KEY` | Resend → API keys |
| `RESEND_FROM_EMAIL` | Optional verified sender, `Name <email@domain>` |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL, no trailing slash |
| `CRON_SECRET` | Any long random string |

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add **all** environment variables above in the Vercel project settings.
3. `vercel.json` already schedules the reminder digest daily at 13:00 UTC (≈ 8/9am US Eastern). Adjust the cron expression if you want a different send time.
4. After the first deploy, update the Stripe webhook endpoint URL and the Supabase redirect URLs to the production domain.

## Security model

- **RLS everywhere** — every table has row-level security; users can only read/write rows where `user_id = auth.uid()`. API routes use the anon key with the caller's session cookie, so RLS is enforced even server-side.
- **Billing fields are locked down** — `subscription_status`, `trial_ends_at`, and `stripe_customer_id` on `profiles` are not updatable by authenticated users (column-level grants); only the service role (Stripe webhook / checkout route) can change them.
- **Middleware gating** — unauthenticated requests are redirected to `/login`; users with an expired trial or inactive subscription can only reach `/billing` until they subscribe.
- **Webhook & cron auth** — the Stripe webhook is verified by signature; the cron route requires the `CRON_SECRET` bearer token. Both are excluded from session middleware.

## How billing state flows

1. Signup trigger sets `subscription_status = 'trial'`, `trial_ends_at = now() + 7 days`.
2. Upgrade → `/api/stripe/checkout` creates (or reuses) a Stripe customer and redirects to Checkout.
3. Stripe webhook (`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`) maps Stripe statuses onto `trial | active | past_due | canceled` in `profiles`.
4. Middleware checks the profile on every app request; no access → redirected to `/billing`, which shows the soft paywall with a resubscribe button.
