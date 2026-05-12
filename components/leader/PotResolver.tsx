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

const potName = (pot: PotWithId) => (pot.type === "main" ? "Pozo principal" : `Pozo secundario ${pot.order}`);

export function PotResolver({ tableId, leaderUid, pots, players, handNumber }: PotResolverProps) {
  const unresolvedPots = useMemo(
    () => pots.filter((pot) => pot.handNumber === handNumber && !pot.distributed).sort((a, b) => a.order - b.order),
    [handNumber, pots],
  );
  const [winnersByPotId, setWinnersByPotId] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerName = (playerId: string) => players.find((candidate) => candidate.id === playerId)?.name ?? playerId;
  const validationError = unresolvedPots.find((pot) => (winnersByPotId[pot.id] ?? []).length === 0)
    ? "Falta elegir ganador en algún pozo."
    : null;
  const canResolve = unresolvedPots.length > 0 && !validationError && !pending;

  const toggleWinner = (pot: PotWithId, playerId: string) => {
    if (!pot.eligiblePlayerIds.includes(playerId)) {
      setError("No se puede elegir a un jugador que no es elegible para este pozo.");
      return;
    }
    const player = players.find((candidate) => candidate.id === playerId);
    if (player?.status === "folded") {
      setError("Un jugador retirado no puede ganar el pozo.");
      return;
    }
    setError(null);
    setWinnersByPotId((current) => {
      const winners = current[pot.id] ?? [];
      const nextWinners = winners.includes(playerId) ? winners.filter((id) => id !== playerId) : [...winners, playerId];
      return { ...current, [pot.id]: nextWinners };
    });
  };

  const resolve = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    const summary = unresolvedPots
      .map((pot) => {
        const winners = winnersByPotId[pot.id] ?? [];
        return `${potName(pot)}: ${winners.length > 1 ? "ganan" : "gana"} ${winners.map(playerName).join(" y ")}${winners.length > 1 ? ", se divide" : ""}`;
      })
      .join("\n");
    if (!window.confirm(`${summary}\n\n¿Confirmás repartir los pozos? Esta acción no se puede deshacer.`)) return;

    setPending(true);
    setError(null);
    try {
      await resolvePotsTx(tableId, leaderUid, winnersByPotId);
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "No se pudieron repartir los pozos.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Repartir pozo</p>
          <h2>Elegir ganadores</h2>
        </div>
        <span className="status-chip">{unresolvedPots.length} pozos</span>
      </div>
      <p className="muted">Seleccioná quién ganó cada pozo. Si hay empate, seleccioná más de un jugador. Un jugador all-in solo puede ganar los pozos donde figura como elegible.</p>
      <p className="muted">Los pozos secundarios aparecen cuando un jugador fue all-in por menos fichas que otros jugadores.</p>
      {error || validationError ? <div className="error-card">{error ?? validationError}</div> : null}
      {unresolvedPots.length === 0 ? <p className="muted">No hay pozos pendientes para esta mano. Terminá la mano para crear los pozos.</p> : null}
      <div className="pot-resolver-list">
        {unresolvedPots.map((pot) => (
          <article key={pot.id} className="pot-resolver-card">
            <div className="leader-player-main">
              <strong>{potName(pot)}</strong>
              <span className="status-chip">${pot.amount}</span>
            </div>
            <p className="muted">Pueden ganarlo: {pot.eligiblePlayerIds.map(playerName).join(", ") || "—"}</p>
            <div className="winner-grid">
              {pot.eligiblePlayerIds.map((playerId) => {
                const player = players.find((candidate) => candidate.id === playerId);
                const checked = (winnersByPotId[pot.id] ?? []).includes(playerId);
                const folded = player?.status === "folded";
                return (
                  <label key={playerId} className={`winner-choice ${checked ? "selected" : ""} ${folded ? "disabled" : ""}`}>
                    <input type="checkbox" checked={checked} disabled={folded} onChange={() => toggleWinner(pot, playerId)} />
                    {player?.name ?? playerId}{folded ? " (retirado)" : ""}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <button className="primary-button" disabled={!canResolve} onClick={resolve}>
        {pending ? "Repartiendo..." : "Repartir pozos"}
      </button>
    </section>
  );
}
