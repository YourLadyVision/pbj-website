-- PBJ sign-ups and filled forms. Run this once in Supabase: SQL Editor > New query > paste > Run.
-- One table holds both: kind = 'signup' (notify me) or 'form' (the longer "fill the form" answers).
-- role says which slide it came from (For artists, For venues, For brands...).

create table if not exists public.leads (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('signup', 'form')),
  role        text,
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 200),
  phone       text check (char_length(phone) <= 40),
  link        text check (char_length(link) <= 300),
  message     text check (char_length(message) <= 2000),
  page        text
);

-- The website may only ADD rows. Nobody on the website can read, change or delete them;
-- you read them in the Supabase dashboard (Table Editor), which can also export to a spreadsheet.
alter table public.leads enable row level security;

drop policy if exists "anyone can add a lead" on public.leads;
create policy "anyone can add a lead" on public.leads for insert to anon with check (true);
