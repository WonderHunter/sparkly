-- Notification « X t'invite à rejoindre Y » quand quelqu'un est ajouté à l'équipe d'un projet.
-- Si la personne invitée n'a pas encore de compte, elle la reçoit à la création de son compte.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (kind in ('comment', 'reply', 'invitation')),
  alter column comment_id drop not null,
  -- L'invitation disparaît une fois acceptée ou refusée : la notification reste et mène au projet.
  add column invitation_id uuid references public.project_invitations (id) on delete set null,
  add column team_title text,
  -- Copie du titre : la personne invitée ne voit pas encore un projet en brouillon.
  add column project_title text,
  add constraint notifications_comment_required check (kind = 'invitation' or comment_id is not null);

-- Invitation créée : on prévient la personne si elle a déjà un compte.
create or replace function public.notify_on_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, project_id, invitation_id, actor_id, team_title, project_title)
  select u.id, 'invitation', new.project_id, new.id, new.invited_by, nullif(new.team_title, ''), pr.title
  from auth.users u
  join public.profiles p on p.id = u.id
  join public.projects pr on pr.id = new.project_id
  where lower(u.email) = new.email
    and u.id is distinct from new.invited_by;
  return new;
end;
$$;

create trigger project_invitations_notify
  after insert on public.project_invitations
  for each row execute function public.notify_on_invitation();

-- Nouveau compte : on retrouve les invitations qui l'attendaient déjà.
create or replace function public.notify_pending_invitations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, project_id, invitation_id, actor_id, team_title, project_title)
  select new.id, 'invitation', i.project_id, i.id, i.invited_by, nullif(i.team_title, ''), pr.title
  from public.project_invitations i
  join public.projects pr on pr.id = i.project_id
  join auth.users u on u.id = new.id
  where i.email = lower(u.email);
  return new;
end;
$$;

create trigger profiles_notify_pending_invitations
  after insert on public.profiles
  for each row execute function public.notify_pending_invitations();

revoke execute on function public.notify_on_invitation() from public, anon, authenticated;
revoke execute on function public.notify_pending_invitations() from public, anon, authenticated;
