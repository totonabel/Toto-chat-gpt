"use client";

import { useState } from "react";
import type { FirebaseTable } from "../../lib/firebase/schema";
import {
  approveWaitingPlayerTx,
  movePlayerSeatTx,
  reactivatePlayerTx,
  reloadPlayerTx,
  setPlayerSittingOutTx,
  softRemovePlayerTx,
} from "../../lib/firebase/transactions";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";

type PlayerManagerProps = {
  tableId: string;
  leaderUid: string;
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
};

const statusLabels: Record<PlayerWithId["status"], string> = {
  active: "activo",
  sittingOut: "ausente",
  waitingNextHand: "esperando próxima mano",
  folded: "retirado",
  allIn: "All-in",
  broke: "sin fichas",
};

export function PlayerManager({ tableId, leaderUid, table, players }: PlayerManagerProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, action: () => Promise<void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(label);
    setError(null);
    try {
      await action();
    } catch (managerError) {
      setError(managerError instanceof Error ? managerError.message : "No se pudo completar la acción.");
    } finally {
      setPending(null);
    }
  };

  const moveSeat = (player: PlayerWithId) => {
    const value = window.prompt(`Mover a ${player.name} al asiento`, String(player.seatNumber ?? 1));
    if (!value) return;
    void run(`mover-${player.id}`, () => movePlayerSeatTx(tableId, leaderUid, player.id, Number(value)));
  };

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Jugadores</p>
          <h2>Gestionar jugadores</h2>
        </div>
        <span className="status-chip">{players.length}/{table.maxPlayers}</span>
      </div>
      {error ? <div className="error-card">{error}</div> : null}
      <div className="leader-player-list">
        {players.map((player) => {
          const isCurrentTurn = player.seatNumber === table.currentTurnSeat;
          const roles = [
            player.seatNumber === table.dealerSeat ? "Dealer" : "",
            player.seatNumber === table.smallBlindSeat ? "SB" : "",
            player.seatNumber === table.bigBlindSeat ? "BB" : "",
            isCurrentTurn ? "Turno" : "",
          ].filter(Boolean);
          const classes = ["leader-player-card", player.status, !player.connected ? "disconnected" : "", isCurrentTurn ? "current" : ""].filter(Boolean).join(" ");
          return (
            <article key={player.id} className={classes}>
              <div className="leader-player-main">
                <div>
                  <strong>{player.name}</strong>
                  <p className="muted">
                    Asiento {player.seatNumber ?? "—"} · {statusLabels[player.status]} {player.isLeader ? "· líder" : ""} {roles.length ? `· ${roles.join(" · ")}` : ""}
                  </p>
                </div>
                <span className={`connection-badge ${player.connected ? "online" : "offline"}`}>{player.connected ? "conectado" : "desconectado"}</span>
              </div>
              <div className="hand-meta-grid">
                <span>Stack ${player.stack}</span>
                <span>Apuesta ${player.currentBet}</span>
                <span>Apostado ${player.totalCommittedThisHand}</span>
                <span>{isCurrentTurn ? "Turno" : "Esperando"}</span>
              </div>
              <div className="leader-actions-grid compact">
                <button className="secondary-button" disabled={Boolean(pending) || !table.allowReloads} onClick={() => run(`recargar-${player.id}`, () => reloadPlayerTx(tableId, leaderUid, player.id), `¿Recargar fichas a ${player.name}?`)}>Recargar</button>
                <button className="secondary-button" disabled={Boolean(pending) || player.status === "sittingOut"} onClick={() => run(`fuera-${player.id}`, () => setPlayerSittingOutTx(tableId, leaderUid, player.id))}>Ausente</button>
                <button className="secondary-button" disabled={Boolean(pending) || player.stack <= 0} onClick={() => run(`reactivar-${player.id}`, () => reactivatePlayerTx(tableId, leaderUid, player.id))}>Reactivar</button>
                <button className="secondary-button" disabled={Boolean(pending)} onClick={() => moveSeat(player)}>Cambiar asiento</button>
                <button className="secondary-button" disabled={Boolean(pending) || player.status !== "waitingNextHand" || player.stack <= 0} onClick={() => run(`aprobar-${player.id}`, () => approveWaitingPlayerTx(tableId, leaderUid, player.id))}>Aprobar</button>
                <button className="danger-button" disabled={Boolean(pending) || player.isLeader} onClick={() => run(`quitar-${player.id}`, () => softRemovePlayerTx(tableId, leaderUid, player.id), `¿Eliminar a ${player.name}?`)}>Eliminar</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
