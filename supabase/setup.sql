-- =====================================================================
--  Rudra InfoTech Lab — database schema, security (RLS) and storage
--
--  Run in Supabase → SQL Editor → New query → paste → Run.
--  Safe to re-run: tables are created if missing, functions/policies replaced.
--  Then run supabase/seed.sql once for the initial content.
--
--  Roles (public.profiles.role):
--    owner    full access, manages users
--    admin    enquiries, projects, apps, services, content, media, SEO, settings, users (not the owner)
--    editor   projects, apps, content, process, toolkit, media
--    pending  signed up / invited, no access until an owner or admin assigns a role
--    disabled no access
-- =====================================================================

-- ─────────────────────────────────────────────────────────────
--  Generic helpers
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────
--  Profiles + roles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '' check (char_length(full_name) <= 80),
  role        text not null default 'pending' check (role in ('owner', 'admin', 'editor', 'pending', 'disabled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'admin', 'editor') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner', 'admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

-- Every new auth user gets a profile with NO access ('pending').
-- Roles are never taken from user-supplied metadata.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80), 'pending')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Role rules, enforced in the database (the admin UI only mirrors them).
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor text := public.my_role();
begin
  -- No JWT user = service role / SQL editor: trusted.
  if auth.uid() is null then
    return new;
  end if;
  if new.id is distinct from old.id or new.email is distinct from old.email or new.created_at is distinct from old.created_at then
    raise exception 'Profile id and email are managed by Supabase Auth' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    if old.id = auth.uid() then
      raise exception 'You cannot change your own role' using errcode = '42501';
    elsif actor = 'owner' then
      null;
    elsif actor = 'admin' then
      if old.role = 'owner' or new.role = 'owner' then
        raise exception 'Only an owner can grant or remove the owner role' using errcode = '42501';
      end if;
    else
      raise exception 'You are not allowed to change roles' using errcode = '42501';
    end if;
    if old.role = 'owner' and (select count(*) from public.profiles where role = 'owner') <= 1 then
      raise exception 'There must always be at least one owner' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
--  Portfolio: categories, projects (websites + apps), images, technologies
-- ─────────────────────────────────────────────────────────────
create table if not exists public.project_categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique check (char_length(btrim(name)) between 1 and 60),
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name                text not null check (char_length(btrim(name)) between 1 and 120),
  short_description   text not null default '' check (char_length(short_description) <= 300),
  full_description    text check (char_length(full_description) <= 8000),
  project_type        text check (project_type in ('BUSINESS WEBSITE', 'E-COMMERCE', 'LANDING PAGE', 'PORTFOLIO', 'WEB APPLICATION', 'WEBSITE REDESIGN', 'ANDROID APPLICATION', 'CUSTOM DEVELOPMENT')),
  category_id         uuid references public.project_categories (id) on delete set null,
  platform            text not null default 'web' check (platform in ('web', 'android', 'ios', 'cross-platform')),
  client_name         text check (char_length(client_name) <= 120),
  live_url            text check (live_url ~ '^https?://[^\s"<>]+$'),
  app_url             text check (app_url ~ '^https?://[^\s"<>]+$'),
  play_store_url      text check (play_store_url ~ '^https://play\.google\.com/[^\s"<>]*$'),
  github_url          text check (github_url ~ '^https://[^\s"<>]+$'),
  completion_year     int check (completion_year between 1990 and 2100),
  project_logo        text check (project_logo ~ '^(https?://|/)[^\s"<>]*$'),
  featured_image      text check (featured_image ~ '^(https?://|/)[^\s"<>]*$'),
  desktop_screenshot  text check (desktop_screenshot ~ '^(https?://|/)[^\s"<>]*$'),
  mobile_screenshot   text check (mobile_screenshot ~ '^(https?://|/)[^\s"<>]*$'),
  accent              text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  headline            text check (char_length(headline) <= 160),
  image_alt           text check (char_length(image_alt) <= 300),
  app_category        text check (char_length(app_category) <= 60),
  status              text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured            boolean not null default false,
  display_order       int not null default 0,
  seo_title           text check (char_length(seo_title) <= 120),
  seo_description     text check (char_length(seo_description) <= 320),
  social_image        text check (social_image ~ '^(https?://|/)[^\s"<>]*$'),
  canonical_url       text check (canonical_url ~ '^https?://[^\s"<>]+$'),
  published_at        timestamptz,
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists projects_status_order_idx on public.projects (status, display_order);

create or replace function public.projects_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists projects_before_write on public.projects;
create trigger projects_before_write before insert or update on public.projects
  for each row execute function public.projects_before_write();
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_images (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  url            text not null check (url ~ '^(https?://|/)[^\s"<>]*$'),
  kind           text not null default 'gallery' check (kind in ('gallery', 'screenshot', 'desktop_mockup', 'mobile_mockup')),
  alt            text check (char_length(alt) <= 300),
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists project_images_project_idx on public.project_images (project_id, display_order);

create table if not exists public.technologies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique check (char_length(btrim(name)) between 1 and 60),
  kind           text not null default '' check (char_length(kind) <= 60),
  category       text not null default '' check (char_length(category) <= 60),
  official_url   text check (official_url ~ '^https?://[^\s"<>]+$'),
  in_toolkit     boolean not null default false,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists technologies_updated_at on public.technologies;
create trigger technologies_updated_at before update on public.technologies
  for each row execute function public.set_updated_at();

create table if not exists public.project_technologies (
  project_id     uuid not null references public.projects (id) on delete cascade,
  technology_id  uuid not null references public.technologies (id) on delete cascade,
  display_order  int not null default 0,
  primary key (project_id, technology_id)
);
create index if not exists project_technologies_tech_idx on public.project_technologies (technology_id);

-- ─────────────────────────────────────────────────────────────
--  Services, process, website content, settings, SEO
-- ─────────────────────────────────────────────────────────────
create table if not exists public.services (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title              text not null check (char_length(btrim(title)) between 1 and 80),
  display            text not null default '' check (char_length(display) <= 80),
  short_description  text not null default '' check (char_length(short_description) <= 200),
  full_description   text not null default '' check (char_length(full_description) <= 6000),
  points             text[] not null default '{}' check (cardinality(points) <= 12),
  symbol             text not null default 'development' check (symbol ~ '^[a-z]{1,30}$'),
  published          boolean not null default true,
  display_order      int not null default 0,
  seo_title          text check (char_length(seo_title) <= 120),
  seo_description    text check (char_length(seo_description) <= 320),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists services_updated_at on public.services;
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

create table if not exists public.process_steps (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 1 and 40),
  description    text not null default '' check (char_length(description) <= 400),
  published      boolean not null default true,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
drop trigger if exists process_steps_updated_at on public.process_steps;
create trigger process_steps_updated_at before update on public.process_steps
  for each row execute function public.set_updated_at();

-- Text-only content groups for the public site (no styling controls).
create table if not exists public.content_sections (
  key         text primary key check (key in ('hero', 'philosophy', 'work', 'apps', 'services', 'about', 'contact', 'footer')),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 20000),
  updated_at  timestamptz not null default now()
);
drop trigger if exists content_sections_updated_at on public.content_sections;
create trigger content_sections_updated_at before update on public.content_sections
  for each row execute function public.set_updated_at();

-- Key/value settings. is_public = readable by the public site build (anon key).
create table if not exists public.site_settings (
  key         text primary key check (key ~ '^[a-z_]{1,40}$'),
  value       jsonb not null default '{}'::jsonb,
  is_public   boolean not null default true,
  updated_at  timestamptz not null default now(),
  constraint site_settings_contact_whatsapp check (key <> 'contact' or coalesce(value ->> 'whatsapp', '') ~ '^[0-9]{0,15}$')
);
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table if not exists public.seo_settings (
  id                  int primary key default 1 check (id = 1),
  site_title          text not null default '' check (char_length(site_title) <= 120),
  meta_description    text not null default '' check (char_length(meta_description) <= 320),
  canonical_base_url  text not null default '' check (canonical_base_url = '' or canonical_base_url ~ '^https?://[^\s/"<>]+$'),
  og_title            text not null default '' check (char_length(og_title) <= 160),
  og_description      text not null default '' check (char_length(og_description) <= 320),
  og_image            text not null default '' check (og_image = '' or og_image ~ '^(https?://|/)[^\s"<>]*$'),
  twitter_image       text not null default '' check (twitter_image = '' or twitter_image ~ '^(https?://|/)[^\s"<>]*$'),
  favicon             text not null default '' check (favicon = '' or favicon ~ '^(https?://|/)[^\s"<>]*$'),
  app_icon            text not null default '' check (app_icon = '' or app_icon ~ '^(https?://|/)[^\s"<>]*$'),
  robots_index        boolean not null default true,
  updated_at          timestamptz not null default now()
);
drop trigger if exists seo_settings_updated_at on public.seo_settings;
create trigger seo_settings_updated_at before update on public.seo_settings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
--  CRM: enquiries + private notes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.enquiries (
  id               uuid primary key default gen_random_uuid(),
  ref              bigint generated always as identity unique,
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  email            text not null check (char_length(email) <= 120 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone            text check (char_length(phone) <= 24),
  whatsapp         text check (whatsapp ~ '^[0-9]{8,15}$'),
  company          text check (char_length(company) <= 100),
  service          text check (char_length(service) <= 80),
  budget           text check (char_length(budget) <= 60),
  message          text not null check (char_length(btrim(message)) between 20 and 2000),
  source           text not null default 'website' check (source in ('website', 'whatsapp', 'email', 'phone', 'referral', 'instagram', 'linkedin', 'other')),
  page_url         text check (char_length(page_url) <= 500),
  status           text not null default 'new' check (status in ('new', 'contacted', 'in_discussion', 'converted', 'closed', 'spam')),
  priority         text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_read          boolean not null default false,
  archived         boolean not null default false,
  next_follow_up   date,
  potential_value  numeric(12, 2) check (potential_value >= 0),
  ip_hash          text check (char_length(ip_hash) <= 128),
  user_agent       text check (char_length(user_agent) <= 400),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_inbox_idx on public.enquiries (archived, status, is_read);
create index if not exists enquiries_ip_idx on public.enquiries (ip_hash, created_at desc);

-- Website submissions always land as NEW + unread, whatever the payload says.
create or replace function public.enquiries_defaults() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.source = 'website' then
    new.status := 'new';
    new.is_read := false;
    new.archived := false;
  end if;
  return new;
end $$;

drop trigger if exists enquiries_defaults on public.enquiries;
create trigger enquiries_defaults before insert on public.enquiries
  for each row execute function public.enquiries_defaults();
drop trigger if exists enquiries_updated_at on public.enquiries;
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create table if not exists public.enquiry_notes (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references public.enquiries (id) on delete cascade,
  author_id    uuid default auth.uid() references auth.users (id) on delete set null,
  author_name  text not null default '',
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at   timestamptz not null default now()
);
create index if not exists enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);

-- The author of a note is always the signed-in user (can't be forged).
create or replace function public.enquiry_notes_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    new.author_name := coalesce((select coalesce(nullif(full_name, ''), email) from public.profiles where id = auth.uid()), '');
  end if;
  return new;
end $$;

drop trigger if exists enquiry_notes_author on public.enquiry_notes;
create trigger enquiry_notes_author before insert on public.enquiry_notes
  for each row execute function public.enquiry_notes_author();

-- ─────────────────────────────────────────────────────────────
--  Media library (files live in the public "media" storage bucket)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  path          text not null unique check (char_length(path) between 1 and 300),
  url           text not null check (url ~ '^https?://[^\s"<>]+$'),
  name          text not null default '' check (char_length(name) <= 160),
  alt           text not null default '' check (char_length(alt) <= 300),
  mime          text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size          int not null default 0 check (size between 0 and 10485760),
  width         int check (width > 0),
  height        int check (height > 0),
  variant_path  text check (char_length(variant_path) <= 300),
  uploaded_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists media_created_idx on public.media (created_at desc);
drop trigger if exists media_updated_at on public.media;
create trigger media_updated_at before update on public.media
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
--  Activity log (written by triggers and security-definer functions only)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id              bigint generated always as identity primary key,
  actor_id        uuid references auth.users (id) on delete set null,
  actor_email     text not null default '',
  action          text not null,
  resource_type   text not null,
  resource_id     text,
  resource_label  text,
  details         jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);

create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec      jsonb := to_jsonb(coalesce(new, old));
  prev     jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  changed  text[];
  act      text := lower(tg_op);
  details  jsonb;
  label    text;
  rid      text;
  who      uuid := auth.uid();
begin
  if coalesce(current_setting('ritl.seeding', true), '') = 'on' then
    return null;
  end if;
  if tg_table_name = 'site_settings' and rec ->> 'key' = 'publish' then
    return null;                                                                                        -- logged by /api/rebuild
  end if;
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into changed
    from jsonb_object_keys(rec) as k
    where k not in ('updated_at', 'published_at') and (rec -> k) is distinct from (prev -> k);
    if changed is null then return null; end if;                                                       -- no-op
    if changed <@ array['display_order'] then return null; end if;                                    -- reorders: one log_event per reorder
    if tg_table_name = 'enquiries' and changed <@ array['is_read'] then return null; end if;          -- opening an enquiry
    details := jsonb_build_object('changed', to_jsonb(changed));
  end if;
  act := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;

  if tg_table_name = 'projects' and tg_op = 'UPDATE' and 'status' = any (changed) then
    act := case rec ->> 'status'
             when 'published' then 'published'
             when 'archived' then 'archived'
             else case prev ->> 'status' when 'published' then 'unpublished' else 'restored' end
           end;
  elsif tg_table_name = 'enquiries' and tg_op = 'INSERT' then
    act := 'received';
  elsif tg_table_name = 'enquiries' and tg_op = 'UPDATE' and 'status' = any (changed) then
    act := 'status changed';
    details := details || jsonb_build_object('from', prev ->> 'status', 'to', rec ->> 'status');
  elsif tg_table_name = 'enquiries' and tg_op = 'UPDATE' and 'archived' = any (changed) then
    act := case when (rec ->> 'archived')::boolean then 'archived' else 'unarchived' end;
  elsif tg_table_name = 'profiles' and tg_op = 'UPDATE' and 'role' = any (changed) then
    act := 'role changed';
    details := details || jsonb_build_object('from', prev ->> 'role', 'to', rec ->> 'role');
  end if;

  if tg_table_name = 'enquiry_notes' then
    rid := rec ->> 'enquiry_id';
    label := 'Note on enquiry';
  else
    rid := coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'project_id');
    label := left(coalesce(rec ->> 'name', rec ->> 'title', rec ->> 'key', rec ->> 'email', rec ->> 'site_title', rid), 160);
  end if;

  insert into public.activity_logs (actor_id, actor_email, action, resource_type, resource_id, resource_label, details)
  values (who,
          coalesce((select email from public.profiles where id = who), case when who is null then 'system' else '' end),
          act, tg_table_name, rid, label, details);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['projects', 'project_categories', 'technologies', 'services', 'process_steps', 'content_sections', 'site_settings', 'seo_settings', 'enquiries', 'enquiry_notes', 'media', 'profiles']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_log', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_change()', t || '_log', t);
  end loop;
end $$;

-- Staff can add one-off events (publish, reorder…); the actor is always the caller.
create or replace function public.log_event(p_action text, p_resource_type text, p_resource_id text default null, p_label text default null, p_details jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_action !~ '^[a-z][a-z ]{1,39}$' or p_resource_type !~ '^[a-z_]{1,40}$' then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  insert into public.activity_logs (actor_id, actor_email, action, resource_type, resource_id, resource_label, details)
  values (auth.uid(), coalesce((select email from public.profiles where id = auth.uid()), ''), p_action, p_resource_type,
          left(p_resource_id, 80), left(p_label, 160), p_details);
end $$;

-- Atomic drag-and-drop ordering. SECURITY INVOKER: row-level security still decides what the caller may update.
create or replace function public.reorder(p_table text, p_ids uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_table not in ('projects', 'services', 'process_steps', 'technologies', 'project_categories') then
    raise exception 'Invalid table' using errcode = '22023';
  end if;
  execute format('update public.%I as t set display_order = s.ord from unnest($1) with ordinality as s(id, ord) where t.id = s.id and t.display_order is distinct from s.ord', p_table)
    using p_ids;
  perform public.log_event('reordered', p_table, null, null, jsonb_build_object('count', cardinality(p_ids)));
end $$;

-- Replace a project's gallery + technologies in ONE transaction (no half-saved projects).
create or replace function public.set_project_media(p_project uuid, p_images jsonb, p_technologies uuid[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.project_images where project_id = p_project;
  insert into public.project_images (project_id, url, kind, alt, display_order)
    select p_project, x.img ->> 'url', coalesce(nullif(x.img ->> 'kind', ''), 'gallery'), nullif(x.img ->> 'alt', ''), x.ord
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) with ordinality as x (img, ord);
  delete from public.project_technologies where project_id = p_project;
  insert into public.project_technologies (project_id, technology_id, display_order)
    select p_project, y.tid, y.ord
    from unnest(coalesce(p_technologies, '{}'::uuid[])) with ordinality as y (tid, ord);
end $$;

-- Dashboard numbers in one round trip (SECURITY INVOKER: editors simply see 0 enquiries).
create or replace function public.dashboard_stats() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'enquiries_unread',   (select count(*) from public.enquiries where not is_read and not archived and status <> 'spam'),
    'enquiries_open',     (select count(*) from public.enquiries where not archived and status in ('new', 'contacted', 'in_discussion')),
    'enquiries_30d',      (select count(*) from public.enquiries where created_at > now() - interval '30 days' and status <> 'spam'),
    'follow_ups_due',     (select count(*) from public.enquiries where not archived and next_follow_up <= current_date and status not in ('converted', 'closed', 'spam')),
    'converted',          (select count(*) from public.enquiries where status = 'converted'),
    'pipeline_value',     (select coalesce(sum(potential_value), 0) from public.enquiries where not archived and status in ('new', 'contacted', 'in_discussion')),
    'projects_published', (select count(*) from public.projects where status = 'published' and platform = 'web'),
    'projects_draft',     (select count(*) from public.projects where status = 'draft'),
    'apps_live',          (select count(*) from public.projects where status = 'published' and platform <> 'web'),
    'media',              (select count(*) from public.media)
  )
$$;

create or replace function public.unread_enquiries() returns bigint
language sql stable security invoker set search_path = public as $$
  select count(*) from public.enquiries where not is_read and not archived and status <> 'spam'
$$;

-- ─────────────────────────────────────────────────────────────
--  Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.project_categories   enable row level security;
alter table public.projects             enable row level security;
alter table public.project_images       enable row level security;
alter table public.technologies         enable row level security;
alter table public.project_technologies enable row level security;
alter table public.services             enable row level security;
alter table public.process_steps        enable row level security;
alter table public.content_sections     enable row level security;
alter table public.site_settings        enable row level security;
alter table public.seo_settings         enable row level security;
alter table public.enquiries            enable row level security;
alter table public.enquiry_notes        enable row level security;
alter table public.media                enable row level security;
alter table public.activity_logs        enable row level security;

-- profiles
drop policy if exists "profiles: read own or staff" on public.profiles;
create policy "profiles: read own or staff" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- project categories + technologies: public read, staff write
drop policy if exists "categories: public read" on public.project_categories;
create policy "categories: public read" on public.project_categories for select to anon, authenticated using (true);
drop policy if exists "categories: staff insert" on public.project_categories;
create policy "categories: staff insert" on public.project_categories for insert to authenticated with check ((select public.is_staff()));
drop policy if exists "categories: staff update" on public.project_categories;
create policy "categories: staff update" on public.project_categories for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "categories: admin delete" on public.project_categories;
create policy "categories: admin delete" on public.project_categories for delete to authenticated using ((select public.is_admin()));

drop policy if exists "technologies: public read" on public.technologies;
create policy "technologies: public read" on public.technologies for select to anon, authenticated using (true);
drop policy if exists "technologies: staff insert" on public.technologies;
create policy "technologies: staff insert" on public.technologies for insert to authenticated with check ((select public.is_staff()));
drop policy if exists "technologies: staff update" on public.technologies;
create policy "technologies: staff update" on public.technologies for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "technologies: staff delete" on public.technologies;
create policy "technologies: staff delete" on public.technologies for delete to authenticated using ((select public.is_staff()));

-- projects: only published rows are public
drop policy if exists "projects: public read published" on public.projects;
create policy "projects: public read published" on public.projects for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
drop policy if exists "projects: staff insert" on public.projects;
create policy "projects: staff insert" on public.projects for insert to authenticated with check ((select public.is_staff()));
drop policy if exists "projects: staff update" on public.projects;
create policy "projects: staff update" on public.projects for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
drop policy if exists "projects: staff delete" on public.projects;
create policy "projects: staff delete" on public.projects for delete to authenticated using ((select public.is_staff()));

drop policy if exists "project images: read with project" on public.project_images;
create policy "project images: read with project" on public.project_images for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
drop policy if exists "project images: staff write" on public.project_images;
create policy "project images: staff write" on public.project_images for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "project technologies: read with project" on public.project_technologies;
create policy "project technologies: read with project" on public.project_technologies for select to anon, authenticated
  using ((select public.is_staff()) or exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
drop policy if exists "project technologies: staff write" on public.project_technologies;
create policy "project technologies: staff write" on public.project_technologies for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- services: admins manage
drop policy if exists "services: public read published" on public.services;
create policy "services: public read published" on public.services for select to anon, authenticated
  using (published or (select public.is_staff()));
drop policy if exists "services: admin write" on public.services;
create policy "services: admin write" on public.services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- process + website content: staff manage
drop policy if exists "process: public read published" on public.process_steps;
create policy "process: public read published" on public.process_steps for select to anon, authenticated
  using (published or (select public.is_staff()));
drop policy if exists "process: staff write" on public.process_steps;
create policy "process: staff write" on public.process_steps for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "content: public read" on public.content_sections;
create policy "content: public read" on public.content_sections for select to anon, authenticated using (true);
drop policy if exists "content: staff insert" on public.content_sections;
create policy "content: staff insert" on public.content_sections for insert to authenticated with check ((select public.is_staff()));
drop policy if exists "content: staff update" on public.content_sections;
create policy "content: staff update" on public.content_sections for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- settings + SEO: admins manage; private settings hidden from the public
drop policy if exists "settings: read public" on public.site_settings;
create policy "settings: read public" on public.site_settings for select to anon, authenticated
  using (is_public or (select public.is_admin()));
drop policy if exists "settings: admin write" on public.site_settings;
create policy "settings: admin write" on public.site_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "seo: public read" on public.seo_settings;
create policy "seo: public read" on public.seo_settings for select to anon, authenticated using (true);
drop policy if exists "seo: admin insert" on public.seo_settings;
create policy "seo: admin insert" on public.seo_settings for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "seo: admin update" on public.seo_settings;
create policy "seo: admin update" on public.seo_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- enquiries + notes: admins only. Website submissions are inserted by the
-- /api/enquiry function with the service key — there is NO public insert policy.
drop policy if exists "enquiries: admin all" on public.enquiries;
create policy "enquiries: admin all" on public.enquiries for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "notes: admin read" on public.enquiry_notes;
create policy "notes: admin read" on public.enquiry_notes for select to authenticated using ((select public.is_admin()));
drop policy if exists "notes: admin insert" on public.enquiry_notes;
create policy "notes: admin insert" on public.enquiry_notes for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "notes: author or owner delete" on public.enquiry_notes;
create policy "notes: author or owner delete" on public.enquiry_notes for delete to authenticated
  using ((select public.is_admin()) and (author_id = (select auth.uid()) or (select public.is_owner())));

-- media: staff only (files themselves are public via the bucket)
drop policy if exists "media: staff all" on public.media;
create policy "media: staff all" on public.media for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- activity: admins read, nobody writes directly
drop policy if exists "activity: admin read" on public.activity_logs;
create policy "activity: admin read" on public.activity_logs for select to authenticated using ((select public.is_admin()));

-- ─────────────────────────────────────────────────────────────
--  Privileges (least privilege for the public anon key)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon;
grant select on public.projects, public.project_images, public.project_categories, public.technologies,
  public.project_technologies, public.services, public.process_steps, public.content_sections,
  public.site_settings, public.seo_settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke execute on function public.log_event(text, text, text, text, jsonb), public.reorder(text, uuid[]),
  public.set_project_media(uuid, jsonb, uuid[]), public.dashboard_stats(), public.unread_enquiries() from public, anon;
grant execute on function public.log_event(text, text, text, text, jsonb), public.reorder(text, uuid[]),
  public.set_project_media(uuid, jsonb, uuid[]), public.dashboard_stats(), public.unread_enquiries() to authenticated;
revoke execute on function public.handle_new_user(), public.handle_user_email_change(), public.protect_profile(),
  public.log_change(), public.enquiry_notes_author() from public, anon, authenticated;
grant execute on function public.my_role(), public.is_staff(), public.is_admin(), public.is_owner() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
--  Storage: public "media" bucket (images only, 10 MB), staff-managed
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ritl media: staff read" on storage.objects;
create policy "ritl media: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "ritl media: staff upload" on storage.objects;
create policy "ritl media: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "ritl media: staff update" on storage.objects;
create policy "ritl media: staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_staff())) with check (bucket_id = 'media' and (select public.is_staff()));
drop policy if exists "ritl media: staff delete" on storage.objects;
create policy "ritl media: staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_staff()));

-- Make PostgREST pick up the new schema immediately.
notify pgrst, 'reload schema';
