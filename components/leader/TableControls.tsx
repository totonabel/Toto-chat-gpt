"use client";

import { useState } from "react";
import { endHandTx, nextBettingRoundTx, startHandTx, startNextHandTx } from "../../lib/firebase/transactions";
import type { FirebaseTable } from "../../lib/firebase/schema";

type TableControlsProps = {
  tableId: string;
  leaderUid: string;
  table: FirebaseTable & { id: string };
};

export function TableControls({ tableId, leaderUid, table }: TableControlsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, action: () => Promise<void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(label);
    setError(null);
    try {
      await action();
    } catch (controlError) {
      setError(controlError instanceof Error ? controlError.message : "Action failed.");
    } finally {
      setPending(null);
    }
  };

  const inHand = table.status === "inHand";

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Hand controls</p>
          <h2>Manage hand</h2>
        </div>
        <span className="status-chip">{table.currentRound}</span>
      </div>
      <div className="hand-meta-grid">
        <span>Dealer: {table.dealerSeat ?? "—"}</span>
        <span>SB: {table.smallBlindSeat ?? "—"}</span>
        <span>BB: {table.bigBlindSeat ?? "—"}</span>
        <span>Turn: {table.currentTurnSeat ?? "—"}</span>
      </div>
      {error ? <div className="error-card">{error}</div> : null}
      <div className="leader-actions-grid">
        <button className="primary-button" disabled={Boolean(pending) || inHand} onClick={() => run("start", () => startHandTx(tableId, leaderUid))}>
          Start hand
        </button>
        <button className="secondary-button" disabled={Boolean(pending) || !inHand} onClick={() => run("round", () => nextBettingRoundTx(tableId, leaderUid))}>
          Next betting round
        </button>
        <button className="danger-button" disabled={Boolean(pending) || !inHand} onClick={() => run("end", () => endHandTx(tableId, leaderUid), "End this hand and create pots?")}>
          End hand
        </button>
        <button className="secondary-button" disabled={Boolean(pending) || table.status === "inHand"} onClick={() => run("next", () => startNextHandTx(tableId, leaderUid), "Reset players and prepare the next hand?")}>
          Start next hand
        </button>
      </div>
      {pending ? <p className="muted">Sending {pending}...</p> : null}
    </section>
  );
}
