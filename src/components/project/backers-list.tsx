import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import type { Investment } from "@/lib/data/funding";
import { formatEuros, groupByInvestor } from "@/lib/domain/funding";
import { pluralize } from "@/lib/utils";

/** « Ils ont financé » : liste publique des enseignant·es financeurs et du total de leurs financements. */
export function BackersList({ investments }: { investments: Investment[] }) {
  const backers = groupByInvestor(investments);
  if (backers.length === 0) {
    return <p className="text-sm text-muted">Aucun financement pour l&apos;instant.</p>;
  }
  return (
    <ul className="space-y-3">
      {backers.map(({ investor, total, count }) => (
        <li key={investor.id} className="flex items-center gap-3">
          <Avatar name={investor.display_name} src={investor.avatar_url} size="sm" />
          <div className="min-w-0 flex-1 text-sm">
            <Link href={`/u/${investor.username}`} className="font-semibold hover:text-spark-strong">
              {investor.display_name}
            </Link>
            {count > 1 && <span className="block text-xs text-muted">en {pluralize(count, "fois", "fois")}</span>}
          </div>
          <span className="text-sm font-bold text-success">{formatEuros(total)}</span>
        </li>
      ))}
    </ul>
  );
}
