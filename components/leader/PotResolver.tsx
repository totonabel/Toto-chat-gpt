"use client";

import { useMemo, useState } from "react";
import { resolvePotsTx } from "../../lib/firebase/transactions";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";
import type { FirebasePot } from "../../lib/firebase/schema";

type PotWithId = FirebasePot & { id: string };

type PotResolverProps = {
  tableId: string;
  leaderUid: string;
  pots: PotWithId[];
  players: PlayerWithId[];
  handNumber: number;
};

export function PotResolver({ tableId, leaderUid, pots, players, handNumber }: PotResolverProps) {
  const unresolvedPots = useMemo(
    () => pots.filter((pot) => pot.handNumber === handNumber && !pot.distributed).sort((a, b) => a.order - b.order),
    [handNumber, pots],
  );
  const [winnersByPotId, setWinnersByPotId] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWinner = (potId: string, playerId: string) => {
    setWinnersByPotId((current) => {
      const winners = current[potId] ?? [];
      const nextWinners = winners.includes(playerId) ? winners.filter((id) => id !== playerId) : [...winners, playerId];
      return { ...current, [potId]: nextWinners };
    });
  };

  const canResolve = unresolvedPots.length > 0 && unresolvedPots.every((pot) => (winnersByPotId[pot.id] ?? []).length > 0) && !pending;

  const resolve = async () => {
    if (!window.confirm("Distribute selected pots to winners?")) return;
    setPending(true);
    setError(null);
    try {
      await resolvePotsTx(tableId, leaderUid, winnersByPotId);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Could not resolve pots.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Showdown</p>
          <h2>Resolve winners</h2>
        </div>
        <span className="status-chip">{unresolvedPots.length} pots</span>
      </div>
      {error ? <div className="error-card">{error}</div> : null}
      {unresolvedPots.length === 0 ? <p className="muted">No unresolved pots for this hand. End the hand to create pots.</p> : null}
      <div className="pot-resolver-list">
        {unresolvedPots.map((pot) => (
          <article key={pot.id} className="pot-resolver-card">
            <div className="leader-player-main">
              <strong>{pot.type === "main" ? "Main pot" : `Side pot ${pot.order}`}</strong>
              <span className="status-chip">${pot.amount}</span>
            </div>
            <p className="muted">Choose one or more winners. Ties are split by the transaction.</p>
            <div className="winner-grid">
              {pot.eligiblePlayerIds.map((playerId) => {
                const player = players.find((candidate) => candidate.id === playerId);
                const checked = (winnersByPotId[pot.id] ?? []).includes(playerId);
                return (
                  <label key={playerId} className={`winner-choice ${checked ? "selected" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleWinner(pot.id, playerId)} />
                    {player?.name ?? playerId}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <button className="primary-button" disabled={!canResolve} onClick={resolve}>
        {pending ? "Distributing..." : "Confirm payout"}
      </button>
    </section>
  );
}
