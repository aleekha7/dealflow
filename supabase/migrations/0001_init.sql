-- ============================================================
-- DealFlow — initial schema
-- Run with: supabase db push  (or paste into the SQL editor)
-- ============================================================

-- ---------- Enums ----------
create type public.firm_tier as enum (
  'Bulge Bracket',
  'Elite Boutique',
  'Middle Market',
  'Boutique',
  'Other'
);

create type public.pipeline_stage as enum (
  'Not Contacted',
  'Emailed',
  'Followed Up',
  'Replied',
  'Coffee Chat Scheduled',
  'Coffee Chat Done',
  'Closed (Positive)',
  'Closed (No Response)'
);

create type public.template_category as enum (
  'Cold Outreach',
  'Follow-Up',
  'Thank You',
  'Coffee Chat Request'
);

create type public.action_type as enum (
  'Emailed',
  'Followed Up',
  'Replied',
  'Coffee Chat',
  'Note Added'
);

create type public.subscription_status as enum (
  'trial',
  'active',
  'canceled',
  'past_due'
);

-- ---------- Tables ----------

-- Profile row per auth user (created automatically by trigger below)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  school text not null default '',
  stripe_customer_id text unique,
  subscription_status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null default '',
  firm text not null default '',
  role text not null default '',
  email text not null default '',
  linkedin_url text not null default '',
  tier public.firm_tier not null default 'Other',
  notes text not null default '',
  pipeline_stage public.pipeline_stage not null default 'Not Contacted',
  reminder_date timestamptz,
  last_action_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  category public.template_category not null default 'Cold Outreach',
  subject text not null default '',
  body text not null default ''
);

create table public.outreach_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  created_at timestamptz not null default now(),
  action_type public.action_type not null,
  note text not null default ''
);

-- ---------- Indexes ----------
create index contacts_user_id_idx on public.contacts (user_id);
create index contacts_user_stage_idx on public.contacts (user_id, pipeline_stage);
create index contacts_reminder_idx on public.contacts (reminder_date) where reminder_date is not null;
create index templates_user_id_idx on public.templates (user_id);
create index outreach_log_user_id_idx on public.outreach_log (user_id);
create index outreach_log_contact_idx on public.outreach_log (contact_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.templates enable row level security;
alter table public.outreach_log enable row level security;

-- profiles: users can read and update their own row only.
-- Inserts happen via the security-definer trigger; billing fields are only
-- writable by the service role (column-level grants below).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Prevent users from editing their own billing/subscription columns through
-- the API: revoke blanket update, grant only safe columns.
revoke update on table public.profiles from authenticated;
grant update (full_name, school) on table public.profiles to authenticated;

-- contacts
create policy "contacts_select_own" on public.contacts
  for select using (auth.uid() = user_id);
create policy "contacts_insert_own" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "contacts_update_own" on public.contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contacts_delete_own" on public.contacts
  for delete using (auth.uid() = user_id);

-- templates
create policy "templates_select_own" on public.templates
  for select using (auth.uid() = user_id);
create policy "templates_insert_own" on public.templates
  for insert with check (auth.uid() = user_id);
create policy "templates_update_own" on public.templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "templates_delete_own" on public.templates
  for delete using (auth.uid() = user_id);

-- outreach_log (immutable history: no update policy)
create policy "log_select_own" on public.outreach_log
  for select using (auth.uid() = user_id);
create policy "log_insert_own" on public.outreach_log
  for insert with check (auth.uid() = user_id);
create policy "log_delete_own" on public.outreach_log
  for delete using (auth.uid() = user_id);

-- ---------- Triggers ----------

-- Keep contacts.last_action_at in sync with the outreach log.
create or replace function public.touch_contact_last_action()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.contacts
     set last_action_at = new.created_at
   where id = new.contact_id;
  return new;
end;
$$;

create trigger on_outreach_log_insert
  after insert on public.outreach_log
  for each row execute function public.touch_contact_last_action();

-- On signup: create the profile (7-day trial) and seed 3 starter templates.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, school, subscription_status, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'school', ''),
    'trial',
    now() + interval '7 days'
  );

  insert into public.templates (user_id, name, category, subject, body) values
  (
    new.id,
    'IB Analyst Cold Outreach',
    'Cold Outreach',
    '{{your_school}} student interested in {{firm}}',
    E'Hi {{first_name}},\n\nMy name is {{your_name}} and I''m a student at {{your_school}} pursuing a career in investment banking. I came across your profile and was really interested in your path to {{firm}}.\n\nI know you''re busy, but if you have 15 minutes in the coming weeks, I''d love to hear about your experience as a {{role}} and any advice you''d have for someone hoping to break into the industry.\n\nThank you so much for your time — happy to work around your schedule.\n\nBest,\n{{your_name}}'
  ),
  (
    new.id,
    'Follow-Up (No Response)',
    'Follow-Up',
    'Re: {{your_school}} student interested in {{firm}}',
    E'Hi {{first_name}},\n\nI wanted to follow up on my note from last week — I know things get busy, so no worries at all if it slipped through.\n\nI''m still very interested in learning about your experience at {{firm}}, and even 10–15 minutes would mean a lot. If it''s easier, I''m happy to send over a few questions by email instead.\n\nThanks again for considering it.\n\nBest,\n{{your_name}}'
  ),
  (
    new.id,
    'Coffee Chat Thank You',
    'Thank You',
    'Thank you — great speaking with you',
    E'Hi {{first_name}},\n\nThank you again for taking the time to speak with me today. I really enjoyed hearing about your work at {{firm}} and your perspective on the industry — your advice on how to approach recruiting was especially helpful.\n\nI''ll keep you posted as I move through the process, and please don''t hesitate to reach out if there''s ever anything I can do for you.\n\nBest,\n{{your_name}}'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
