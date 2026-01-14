-- 1) Secure helper to mark messages as read (avoids granting broad UPDATE on messages)
create or replace function public.mark_messages_read(conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if conversation_id is null then
    return 0;
  end if;

  -- Only participants in the conversation may mark messages as read
  if not exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and auth.uid() = any(c.participant_ids)
  ) then
    return 0;
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = conversation_id
    and m.sender_id <> auth.uid()
    and m.read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.mark_messages_read(uuid) from public;
grant execute on function public.mark_messages_read(uuid) to authenticated;


-- 2) Allow admins to manage tracks inside admin playlists
-- (fixes: "new row violates row-level security policy" on media_playlist_tracks)
create policy "Admins can insert admin playlist tracks"
on public.media_playlist_tracks
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  and exists (
    select 1
    from public.media_playlists p
    where p.id = media_playlist_tracks.playlist_id
      and p.is_admin_playlist = true
  )
);

create policy "Admins can update admin playlist tracks"
on public.media_playlist_tracks
for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  and exists (
    select 1
    from public.media_playlists p
    where p.id = media_playlist_tracks.playlist_id
      and p.is_admin_playlist = true
  )
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  and exists (
    select 1
    from public.media_playlists p
    where p.id = media_playlist_tracks.playlist_id
      and p.is_admin_playlist = true
  )
);

create policy "Admins can delete admin playlist tracks"
on public.media_playlist_tracks
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  and exists (
    select 1
    from public.media_playlists p
    where p.id = media_playlist_tracks.playlist_id
      and p.is_admin_playlist = true
  )
);
