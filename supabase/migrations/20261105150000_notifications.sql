-- Notifications in-app : un commentaire sur son projet, une réponse à son commentaire.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('comment', 'reply')),
  project_id uuid not null references public.projects (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Chacun ne voit que ses notifications. Aucune écriture directe : le trigger les crée,
-- les fonctions ci-dessous les marquent comme lues.
create policy "notifications: lecture des siennes" on public.notifications
  for select to authenticated using (user_id = auth.uid());

grant select on public.notifications to authenticated;

-- À chaque commentaire : l'auteur du commentaire parent reçoit « reply »,
-- les membres du projet reçoivent « comment ». Jamais l'auteur lui-même, jamais deux fois.
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_author uuid;
begin
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.author_id then
      insert into public.notifications (user_id, kind, project_id, comment_id, actor_id)
      values (v_parent_author, 'reply', new.project_id, new.id, new.author_id);
    end if;
  end if;

  insert into public.notifications (user_id, kind, project_id, comment_id, actor_id)
  select m.user_id, 'comment', new.project_id, new.id, new.author_id
  from public.project_members m
  where m.project_id = new.project_id
    and m.user_id <> new.author_id
    and m.user_id is distinct from v_parent_author;

  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Marque une notification (ou toutes, si p_id est null) comme lue.
create or replace function public.mark_notifications_read(p_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_id is null or id = p_id);
$$;

revoke execute on function public.mark_notifications_read(uuid) from public, anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
