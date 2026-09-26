-- Admin file uploads (client brief item 6): a private bucket plus a
-- tracking table keyed on master_profile_id -- a person-level artifact,
-- same as their Blueprint conceptually, not tied to one session.
insert into storage.buckets (id, name, public)
values ('participant-files', 'participant-files', false)
on conflict (id) do nothing;

create table public.participant_files (
  id uuid primary key default gen_random_uuid(),
  master_profile_id uuid not null references public.master_profiles (id) on delete cascade,
  uploaded_by uuid references public.admin_users (id) on delete set null,
  file_path text not null unique,
  file_name text not null,
  label text,
  uploaded_at timestamptz not null default now()
);

alter table public.participant_files enable row level security;

create or replace function public.can_read_master_profile(p_master_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.participants me
    where me.id = auth.uid() and me.master_profile_id = p_master_profile_id
  );
$$;

comment on function public.can_read_master_profile(uuid) is
  'Security definer, same shape as can_read_participant_session -- true '
  'for admins, or for a participant reading their own master profiles '
  'files (any registration sharing it, via the participants.id = auth.uid() '
  'row this session is signed in as).';

create policy "admins manage participant files"
  on public.participant_files for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "participants read own profile files"
  on public.participant_files for select
  using (public.can_read_master_profile(master_profile_id));

-- storage.objects: same admin-write / sibling-read shape, keyed on the
-- object's path rather than a foreign key (storage.objects has no FK to
-- application tables) -- files are uploaded to
-- <master_profile_id>/<uuid>-<filename>, so the first path segment is the
-- profile id.
create policy "admins manage participant files storage"
  on storage.objects for all
  using (bucket_id = 'participant-files' and public.is_admin())
  with check (bucket_id = 'participant-files' and public.is_admin());

create policy "participants read own profile files storage"
  on storage.objects for select
  using (
    bucket_id = 'participant-files'
    and public.can_read_master_profile((storage.foldername(name))[1]::uuid)
  );
