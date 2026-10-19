import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import { MEMBER_ROLE_LABEL, type Member } from "@/lib/types";

/** Bloc « Présentation de l'équipe » : photo, prénom nom, rôle dans l'équipe. */
export function TeamGrid({ members }: { members: Member[] }) {
  if (members.length === 0) return <p className="text-sm text-muted">Aucun membre pour l&apos;instant.</p>;
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {members.map((m) => (
        <li key={m.user_id} className="text-center">
          <Link href={`/u/${m.profile.username}`} className="group inline-flex flex-col items-center">
            <Avatar name={m.profile.display_name} src={m.profile.avatar_url} size="lg" className="ring-4 ring-surface transition group-hover:ring-spark-soft" />
            <span className="mt-3 font-semibold group-hover:text-spark-strong">{m.profile.display_name}</span>
          </Link>
          <p className="text-sm text-muted">{m.team_title || MEMBER_ROLE_LABEL[m.role]}</p>
        </li>
      ))}
    </ul>
  );
}
