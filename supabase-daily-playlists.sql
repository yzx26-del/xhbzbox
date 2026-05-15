create table if not exists public.daily_playlists (
  date text primary key,
  theme text,
  theme_quote text,
  theme_quote_source text,
  songs_json jsonb not null default '[]'::jsonb,
  playlist_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_playlists enable row level security;

drop policy if exists "daily_playlists_select_all" on public.daily_playlists;
create policy "daily_playlists_select_all"
on public.daily_playlists for select
using (true);

drop policy if exists "daily_playlists_insert_all" on public.daily_playlists;
create policy "daily_playlists_insert_all"
on public.daily_playlists for insert
with check (true);

drop policy if exists "daily_playlists_update_all" on public.daily_playlists;
create policy "daily_playlists_update_all"
on public.daily_playlists for update
using (true)
with check (true);
