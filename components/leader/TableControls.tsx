"use client";

import { useState } from "react";
import { endHandTx, nextBettingRoundTx, startHandTx, startNextHandTx } from "../../lib/firebase/transactions";
import type { FirebaseTable } from "../../lib/firebase/schema";

type TableControlsProps = {
  tableId: string;
  leaderUid: string;
  table: FirebaseTable & { id: string };
};

const roundLabels: Record<FirebaseTable["currentRound"], string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
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
      setError(controlError instanceof Error ? controlError.message : "No se pudo completar la acción.");
    } finally {
      setPending(null);
    }
  };

  const inHand = table.status === "inHand";

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Controles de mano</p>
          <h2>Gestionar mano</h2>
        </div>
        <span className="status-chip">{roundLabels[table.currentRound]}</span>
      </div>
      <div className="hand-meta-grid">
        <span>Dealer: {table.dealerSeat ?? "—"}</span>
        <span>Ciega chica: {table.smallBlindSeat ?? "—"}</span>
        <span>Ciega grande: {table.bigBlindSeat ?? "—"}</span>
        <span>Turno: {table.currentTurnSeat ?? "—"}</span>
      </div>
      {error ? <div className="error-card">{error}</div> : null}
      <div className="leader-actions-grid">
        <button className="primary-button" disabled={Boolean(pending) || inHand} onClick={() => run("iniciar", () => startHandTx(tableId, leaderUid))}>Iniciar mano</button>
        <button className="secondary-button" disabled={Boolean(pending) || !inHand} onClick={() => run("ronda", () => nextBettingRoundTx(tableId, leaderUid))}>Siguiente ronda</button>
        <button className="danger-button" disabled={Boolean(pending) || !inHand} onClick={() => run("terminar", () => endHandTx(tableId, leaderUid), "¿Terminar esta mano y crear los pozos?")}>Terminar mano</button>
        <button className="secondary-button" disabled={Boolean(pending) || table.status === "inHand"} onClick={() => run("siguiente", () => startNextHandTx(tableId, leaderUid), "¿Iniciar la siguiente mano?")}>Iniciar siguiente mano</button>
      </div>
      {pending ? <p className="muted">Enviando {pending}...</p> : null}
    </section>
  );
}
