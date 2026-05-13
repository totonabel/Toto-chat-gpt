"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";
import type { FirebasePot } from "../../lib/firebase/schema";
import { PlayerGameView } from "../table/PlayerGameView";
import { PlayerManager } from "./PlayerManager";
import { PotResolver } from "./PotResolver";
import { TableControls } from "./TableControls";
import { clearLocalSession } from "../../lib/session/localSession";

type LeaderDashboardProps = {
  tableId: string;
  leaderUid: string;
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
  pots: Array<FirebasePot & { id: string }>;
};

const formatMoney = (amount: number) => `$${amount}`;

const statusLabels: Record<FirebaseTable["status"], string> = {
  waiting: "Esperando",
  inHand: "Mano en curso",
  showdown: "Showdown",
  finished: "Mesa finalizada",
};

const roundLabels: Record<FirebaseTable["currentRound"], string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

type LeaderMode = "play" | "admin";

export function LeaderDashboard({ tableId, leaderUid, table, players, pots }: LeaderDashboardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<LeaderMode>("play");
  const [preparedRaise, setPreparedRaise] = useState(0);
  const connectedPlayers = players.filter((player) => player.connected).length;
  const myPlayer = players.find((player) => player.id === leaderUid) ?? null;
  const currentTurnPlayer = players.find((player) => player.seatNumber === table.currentTurnSeat);
  const dealer = players.find((player) => player.seatNumber === table.dealerSeat);
  const smallBlind = players.find((player) => player.seatNumber === table.smallBlindSeat);
  const bigBlind = players.find((player) => player.seatNumber === table.bigBlindSeat);
  const potTotal = useMemo(() => {
    const unresolvedTotal = pots.filter((pot) => pot.handNumber === table.handNumber && !pot.distributed).reduce((total, pot) => total + pot.amount, 0);
    return unresolvedTotal > 0 ? unresolvedTotal : table.potTotal;
  }, [pots, table.handNumber, table.potTotal]);
  const amountToCall = Math.max(0, table.highestBet - (myPlayer?.currentBet ?? 0));
  const isLeaderPlaying = Boolean(myPlayer?.seatNumber !== null);
  const isMyTurn = Boolean(myPlayer?.seatNumber !== null && myPlayer?.seatNumber === table.currentTurnSeat);
  const chipDisabled = !isMyTurn || !myPlayer || table.status === "finished" || ["folded", "allIn", "broke", "waitingNextHand"].includes(myPlayer.status);

  const statusText = useMemo(() => {
    if (table.status === "finished") return "Mesa finalizada";
    if (!myPlayer) return "Cargando jugador líder...";
    if (!isLeaderPlaying) return "Elegí un asiento para jugar";
    if (myPlayer.status === "allIn") return "Estás all-in";
    if (myPlayer.status === "folded") return "Te retiraste";
    if (myPlayer.status === "broke") return "Te quedaste sin fichas";
    if (myPlayer.status === "waitingNextHand") return "Entrás en la próxima mano";
    if (isMyTurn) return "Es tu turno";
    if (currentTurnPlayer) return `Esperando turno de ${currentTurnPlayer.name}`;
    return table.status === "waiting" ? "Esperando iniciar mano" : "Esperando turno";
  }, [currentTurnPlayer, isLeaderPlaying, isMyTurn, myPlayer, table.status]);

  if (mode === "play") {
    return (
      <main className={`leader-play-page ${isMyTurn ? "my-turn" : ""}`}>
        <nav className="leader-mode-tabs" aria-label="Modo del líder">
          <button type="button" className="selected" onClick={() => setMode("play")}>Jugar</button>
          <button type="button" onClick={() => setMode("admin")}>Administrar</button>
        </nav>
        {isLeaderPlaying ? (
          <PlayerGameView
            tableId={tableId}
            uid={leaderUid}
            table={table}
            players={players}
            myPlayer={myPlayer}
            pots={pots}
            preparedRaise={preparedRaise}
            statusText={statusText}
            potTotal={potTotal}
            amountToCall={amountToCall}
            isMyTurn={isMyTurn}
            chipDisabled={chipDisabled}
            onAddChip={(value) => setPreparedRaise((amount) => amount + value)}
            onClearPreparedRaise={() => setPreparedRaise(0)}
          />
        ) : (
          <section className="leader-card leader-empty-play">
            <p className="eyebrow">Jugar</p>
            <h2>Necesitás un asiento</h2>
            <p className="muted">Cambiá a Administrar y asignate un asiento para participar como jugador.</p>
            <button type="button" className="primary-button" onClick={() => setMode("admin")}>Administrar mesa</button>
          </section>
        )}
      </main>
    );
  }

  const leaveTable = () => {
    clearLocalSession();
    router.push("/");
  };

  return (
    <main className="leader-page admin-mode">
      <nav className="leader-mode-tabs" aria-label="Modo del líder">
        <button type="button" onClick={() => setMode("play")}>Jugar</button>
        <button type="button" className="selected" onClick={() => setMode("admin")}>Administrar</button>
      </nav>
      <header className="leader-hero compact-admin">
        <div>
          <p className="eyebrow">Administrar mesa</p>
          <h1>{table.name}</h1>
        </div>
        <div className="table-code-card">
          <span>Código de mesa</span>
          <strong>{table.code}</strong>
        </div>
        <div className="leader-hero-actions">
          <button type="button" className="secondary-button leave-table-button" onClick={leaveTable}>Salir de la mesa</button>
        </div>
        <div className="leader-status-row">
          <span className="status-chip">{statusLabels[table.status]}</span>
          <span className="status-chip">{connectedPlayers} conectados</span>
          <span className="status-chip">Mano {table.handNumber}</span>
          <span className="status-chip">Ronda {roundLabels[table.currentRound]}</span>
        </div>
        <div className="hand-meta-grid leader-summary-grid">
          <span>Pozo: {formatMoney(potTotal)}</span>
          <span>Dealer: {dealer ? `${dealer.name} (asiento ${dealer.seatNumber})` : "—"}</span>
          <span>Ciega chica: {smallBlind ? `${smallBlind.name} (asiento ${smallBlind.seatNumber})` : "—"}</span>
          <span>Ciega grande: {bigBlind ? `${bigBlind.name} (asiento ${bigBlind.seatNumber})` : "—"}</span>
          <span>Turno: {currentTurnPlayer ? `${currentTurnPlayer.name} (asiento ${currentTurnPlayer.seatNumber})` : "—"}</span>
        </div>
      </header>

      <PlayerManager tableId={tableId} leaderUid={leaderUid} table={table} players={players} />
      <TableControls tableId={tableId} leaderUid={leaderUid} table={table} />
      <PotResolver tableId={tableId} leaderUid={leaderUid} pots={pots} players={players} handNumber={table.handNumber} />
    </main>
  );
}
