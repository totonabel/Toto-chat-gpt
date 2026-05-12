"use client";

import { useEffect, useState } from "react";
import type { FirebasePot, FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";

type DebugPanelProps = {
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
  pots: Array<FirebasePot & { id: string }>;
  snapshotLabel?: string;
};

const shouldShowDebug = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("debug=1");
};

export function DebugPanel({ table, players, pots, snapshotLabel = "live" }: DebugPanelProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldShowDebug());
  }, []);

  if (!enabled) return null;

  const debugState = {
    table: {
      id: table.id,
      code: table.code,
      status: table.status,
      handNumber: table.handNumber,
      currentTurnSeat: table.currentTurnSeat,
      currentRound: table.currentRound,
      dealerSeat: table.dealerSeat,
      smallBlindSeat: table.smallBlindSeat,
      bigBlindSeat: table.bigBlindSeat,
      highestBet: table.highestBet,
      potTotal: table.potTotal,
      updatedAt: table.updatedAt,
    },
    players: players.map(({ id, name, seatNumber, stack, status, connected, currentBet, totalCommittedThisHand }) => ({
      id,
      name,
      seatNumber,
      stack,
      status,
      connected,
      currentBet,
      totalCommittedThisHand,
    })),
    pots: pots.map(({ id, amount, eligiblePlayerIds, winnerIds, distributed, handNumber, type, order }) => ({
      id,
      amount,
      eligiblePlayerIds,
      winnerIds,
      distributed,
      handNumber,
      type,
      order,
    })),
    snapshotLabel,
    copiedAt: new Date().toISOString(),
  };

  const copyState = async () => {
    await navigator.clipboard?.writeText(JSON.stringify(debugState, null, 2));
  };

  return (
    <details className="debug-panel">
      <summary>Debug table state</summary>
      <div className="debug-grid">
        <span>turn seat: {table.currentTurnSeat ?? "—"}</span>
        <span>round: {table.currentRound}</span>
        <span>status: {table.status}</span>
        <span>snapshot: {snapshotLabel}</span>
      </div>
      <div className="debug-pots">
        {pots.map((pot) => (
          <div key={pot.id}>
            <strong>{pot.id}</strong>: ${pot.amount} · eligible {pot.eligiblePlayerIds.join(", ") || "none"}
          </div>
        ))}
      </div>
      <button type="button" className="secondary-button" onClick={copyState}>
        Copy table state
      </button>
    </details>
  );
}
