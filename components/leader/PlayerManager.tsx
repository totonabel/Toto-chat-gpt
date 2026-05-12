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
      setError(managerError instanceof Error ? managerError.message : "Action failed.");
    } finally {
      setPending(null);
    }
  };

  const moveSeat = (player: PlayerWithId) => {
    const value = window.prompt(`Move ${player.name} to seat number`, String(player.seatNumber ?? 1));
    if (!value) return;
    void run(`move-${player.id}`, () => movePlayerSeatTx(tableId, leaderUid, player.id, Number(value)));
  };

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">Players</p>
          <h2>Manage players</h2>
        </div>
        <span className="status-chip">{players.length}/{table.maxPlayers}</span>
      </div>
      {error ? <div className="error-card">{error}</div> : null}
      <div className="leader-player-list">
        {players.map((player) => {
          const isCurrentTurn = player.seatNumber === table.currentTurnSeat;
          const classes = ["leader-player-card", player.status, !player.connected ? "disconnected" : "", isCurrentTurn ? "current" : ""].filter(Boolean).join(" ");
          return (
            <article key={player.id} className={classes}>
              <div className="leader-player-main">
                <div>
                  <strong>{player.name}</strong>
                  <p className="muted">
                    Seat {player.seatNumber ?? "—"} · {player.status} {player.isLeader ? "· leader" : ""}
                  </p>
                </div>
                <span className={`connection-badge ${player.connected ? "online" : "offline"}`}>{player.connected ? "online" : "offline"}</span>
              </div>
              <div className="hand-meta-grid">
                <span>Stack ${player.stack}</span>
                <span>Bet ${player.currentBet}</span>
                <span>Committed ${player.totalCommittedThisHand}</span>
                <span>{isCurrentTurn ? "Current turn" : "Waiting"}</span>
              </div>
              <div className="leader-actions-grid compact">
                <button className="secondary-button" disabled={Boolean(pending) || !table.allowReloads} onClick={() => run(`reload-${player.id}`, () => reloadPlayerTx(tableId, leaderUid, player.id), `Reload ${player.name}?`)}>
                  Reload
                </button>
                <button className="secondary-button" disabled={Boolean(pending) || player.status === "sittingOut"} onClick={() => run(`out-${player.id}`, () => setPlayerSittingOutTx(tableId, leaderUid, player.id))}>
                  Sitting out
                </button>
                <button className="secondary-button" disabled={Boolean(pending) || player.stack <= 0} onClick={() => run(`active-${player.id}`, () => reactivatePlayerTx(tableId, leaderUid, player.id))}>
                  Reactivate
                </button>
                <button className="secondary-button" disabled={Boolean(pending)} onClick={() => moveSeat(player)}>
                  Move seat
                </button>
                <button className="secondary-button" disabled={Boolean(pending) || player.status !== "waitingNextHand" || player.stack <= 0} onClick={() => run(`approve-${player.id}`, () => approveWaitingPlayerTx(tableId, leaderUid, player.id))}>
                  Approve
                </button>
                <button className="danger-button" disabled={Boolean(pending) || player.isLeader} onClick={() => run(`remove-${player.id}`, () => softRemovePlayerTx(tableId, leaderUid, player.id), `Soft remove ${player.name}?`)}>
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
