import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import type { Investment } from "@/lib/data/funding";
import { formatEuros } from "@/lib/domain/funding";

/** « Ils ont financé » : liste publique des enseignant·es financeurs et de leur montant. */
export function BackersList({ investments }: { investments: Investment[] }) {
  if (investments.length === 0) {
    return <p className="text-sm text-muted">Aucun financement pour l&apos;instant.</p>;
  }
  return (
    <ul className="space-y-3">
      {investments.map((inv) => (
        <li key={inv.id} className="flex items-center gap-3">
          <Avatar name={inv.investor?.display_name ?? "Compte supprimé"} src={inv.investor?.avatar_url} size="sm" />
          <div className="min-w-0 flex-1 text-sm">
            {inv.investor ? (
              <Link href={`/u/${inv.investor.username}`} className="font-semibold hover:text-spark-strong">
                {inv.investor.display_name}
              </Link>
            ) : (
              <span className="text-muted">Compte supprimé</span>
            )}
          </div>
          <span className="text-sm font-bold text-success">{formatEuros(inv.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
