create table if not exists public.device_push_tokens (
  expo_push_token text primary key,
  platform text not null check (platform in ('android', 'ios', 'web')),
  new_music boolean not null default true,
  artist_releases boolean not null default true,
  app_announcements boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expo_push_token_format check (
    expo_push_token like 'ExponentPushToken[%'
    or expo_push_token like 'ExpoPushToken[%'
  )
);

alter table public.device_push_tokens enable row level security;

-- The app does not require account login for device registration.
-- Clients can only call this narrow upsert function; there are no table read,
-- insert, update or delete policies for the anon role.
create or replace function public.register_device_push_token(
  p_expo_push_token text,
  p_platform text,
  p_new_music boolean,
  p_artist_releases boolean,
  p_app_announcements boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_expo_push_token is null
    or length(p_expo_push_token) < 20
    or length(p_expo_push_token) > 512
    or not (
      p_expo_push_token like 'ExponentPushToken[%'
      or p_expo_push_token like 'ExpoPushToken[%'
    ) then
    raise exception 'Invalid Expo push token';
  end if;

  if p_platform not in ('android', 'ios', 'web') then
    raise exception 'Unsupported platform';
  end if;

  insert into public.device_push_tokens (
    expo_push_token, platform, new_music, artist_releases, app_announcements, updated_at
  ) values (
    p_expo_push_token, p_platform, p_new_music, p_artist_releases, p_app_announcements, now()
  )
  on conflict (expo_push_token) do update set
    platform = excluded.platform,
    new_music = excluded.new_music,
    artist_releases = excluded.artist_releases,
    app_announcements = excluded.app_announcements,
    updated_at = now();
end;
$$;

revoke all on function public.register_device_push_token(text, text, boolean, boolean, boolean) from public;
grant execute on function public.register_device_push_token(text, text, boolean, boolean, boolean) to anon;

revoke all on public.device_push_tokens from anon, authenticated;
