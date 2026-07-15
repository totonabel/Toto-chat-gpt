"use client";

import { ActionBar } from "../actions/ActionBar";
import { ChipSelector } from "../chips/ChipSelector";
import { PreparedRaise } from "../chips/PreparedRaise";
import type { FirebasePlayer, FirebasePot, FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";
import { PokerTable } from "./PokerTable";

type PlayerGameViewProps = {
  tableId: string;
  uid: string;
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
  myPlayer: (FirebasePlayer & { id: string }) | null;
  pots: Array<FirebasePot & { id: string }>;
  preparedRaise: number;
  statusText: string;
  potTotal: number;
  amountToCall: number;
  isMyTurn: boolean;
  chipDisabled: boolean;
  onAddChip: (value: number) => void;
  onClearPreparedRaise: () => void;
  onToast?: (message: string, tone?: "info" | "success" | "warning" | "error") => void;
  onLeaveTable?: () => void;
  className?: string;
};

const formatMoney = (amount: number) => `$${amount}`;

const roundLabels: Record<FirebaseTable["currentRound"], string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

export function PlayerGameView({
  tableId,
  uid,
  table,
  players,
  myPlayer,
  pots,
  preparedRaise,
  statusText,
  potTotal,
  amountToCall,
  isMyTurn,
  chipDisabled,
  onAddChip,
  onClearPreparedRaise,
  onToast,
  onLeaveTable,
  className = "",
}: PlayerGameViewProps) {
  const currentTurnPlayer = players.find((player) => player.seatNumber === table.currentTurnSeat);

  return (
    <section className={`player-game-view ${isMyTurn ? "my-turn" : ""} ${className}`} aria-label="Vista de juego">
      <header className="player-header compact" aria-label="Estado del jugador">
        <div className="stat-card primary-stat">
          <span className="muted">Pozo</span>
          <strong>{formatMoney(potTotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Mis fichas</span>
          <strong>{formatMoney(myPlayer?.stack ?? 0)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Igualar</span>
          <strong>{formatMoney(amountToCall)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Ronda/turno</span>
          <strong>{roundLabels[table.currentRound]}</strong>
          <small>{currentTurnPlayer ? currentTurnPlayer.name : "—"}</small>
        </div>
        <div className="status-pill">{statusText}</div>
        {onLeaveTable ? (
          <button type="button" className="secondary-button leave-table-button" onClick={onLeaveTable}>Salir</button>
        ) : null}
      </header>

      <section className="table-stage compact">
        <PokerTable table={table} players={players} potTotal={potTotal} compact />
        <div className="chip-action-panel">
          <ChipSelector disabled={chipDisabled} onAdd={onAddChip} values={table.chipValues.length ? table.chipValues : undefined} />
          <PreparedRaise amount={preparedRaise} onClear={onClearPreparedRaise} />
        </div>
      </section>

      <div className="player-action-dock">
        <ActionBar
          tableId={tableId}
          uid={uid}
          table={table}
          players={players}
          myPlayer={myPlayer}
          pots={pots}
          preparedRaise={preparedRaise}
          onClearPreparedRaise={onClearPreparedRaise}
          onToast={onToast}
        />
      </div>
    </section>
  );
}
