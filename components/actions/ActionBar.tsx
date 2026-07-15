"use client";

import { useState } from "react";
import { allInTx, callTx, checkTx, foldTx, raiseTx } from "../../lib/firebase/transactions";
import type { FirebasePlayer, FirebasePot, FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";

type ActionBarProps = {
  tableId: string;
  uid: string;
  table: (FirebaseTable & { id: string }) | null;
  players: PlayerWithId[];
  myPlayer: (FirebasePlayer & { id: string }) | null;
  pots: Array<FirebasePot & { id: string }>;
  preparedRaise: number;
  onClearPreparedRaise: () => void;
  onToast?: (message: string, tone?: "info" | "success" | "warning" | "error") => void;
};

export function ActionBar({ tableId, uid, table, players, myPlayer, pots, preparedRaise, onClearPreparedRaise, onToast }: ActionBarProps) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingFold, setConfirmingFold] = useState(false);

  const amountToCall = Math.max(0, (table?.highestBet ?? 0) - (myPlayer?.currentBet ?? 0));
  const isMyTurn = Boolean(myPlayer?.seatNumber !== null && myPlayer?.seatNumber === table?.currentTurnSeat);
  const blockedStatus = myPlayer?.status === "folded" || myPlayer?.status === "allIn" || myPlayer?.status === "broke" || myPlayer?.status === "waitingNextHand";
  const disabled = !table || !myPlayer || table.status === "finished" || !isMyTurn || blockedStatus || pendingAction !== null;
  const raiseTotal = amountToCall + preparedRaise;
  const canCheck = !disabled && amountToCall === 0;
  const canCall = !disabled && amountToCall > 0 && amountToCall <= (myPlayer?.stack ?? 0);
  const canRaise = !disabled && preparedRaise > 0 && raiseTotal <= (myPlayer?.stack ?? 0);
  const currentPlayer = players.find((player) => player.seatNumber === table?.currentTurnSeat);
  const potsTotal = pots.reduce((total, pot) => total + pot.amount, 0);
  const livePotTotal = potsTotal > 0 ? potsTotal : table?.potTotal ?? 0;

  const run = async (label: string, action: () => Promise<void>, clearRaise = false, successMessage?: string) => {
    if (pendingAction) return;
    setPendingAction(label);
    setError(null);
    onToast?.(`Enviando ${label}...`, "info");
    navigator.vibrate?.(18);
    try {
      await action();
      if (clearRaise) onClearPreparedRaise();
      onToast?.(successMessage ?? `${label} enviado`, "success");
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "La acción falló.";
      setError(message);
      onToast?.(message, "error");
    } finally {
      setPendingAction(null);
    }
  };

  const confirmFold = () => {
    setConfirmingFold(false);
    void run("fold", () => foldTx(tableId, uid), true, "Te retiraste");
  };

  return (
    <section aria-label="Acciones del jugador">
      {error ? <div className="error-card">{error}</div> : null}
      {confirmingFold ? (
        <div className="fold-confirm-card" role="alertdialog" aria-label="Confirmar retiro">
          <span>¿Retirarte de esta mano?</span>
          <div className="fold-confirm-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmingFold(false)}>Cancelar</button>
            <button type="button" className="danger-button" onClick={confirmFold}>Retirarme</button>
          </div>
        </div>
      ) : null}
      <div className="action-bar">
        <button className="action-button" type="button" disabled={!canCheck} onClick={() => run("check", () => checkTx(tableId, uid), false, "Pasaste")}>
          Pasar
        </button>
        <button className="action-button primary" type="button" disabled={!canCall} onClick={() => run("call", () => callTx(tableId, uid), false, `Igualaste $${amountToCall}`)}>
          Igualar ${amountToCall}
        </button>
        <button className="action-button primary" type="button" disabled={!canRaise} onClick={() => run("raise", () => raiseTx(tableId, uid, preparedRaise), true, `Subiste $${preparedRaise}`)}>
          Subir ${preparedRaise}
        </button>
        <button className="action-button" type="button" disabled={disabled} onClick={() => run("all-in", () => allInTx(tableId, uid), true, "Estás all-in")}>
          All In
        </button>
        <button
          className="action-button danger"
          type="button"
          disabled={disabled}
          onClick={() => setConfirmingFold(true)}
        >
          Retirarse
        </button>
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: "0.78rem" }}>
        {pendingAction ? `Enviando ${pendingAction}...` : `Pozo en vivo $${livePotTotal} · ${currentPlayer ? `Turno: ${currentPlayer.name}` : "Nadie esperando"}`}
      </p>
    </section>
  );
}
