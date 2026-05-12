"use client";

import type { FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";
import type { FirebasePot } from "../../lib/firebase/schema";
import { ActionHistory } from "./ActionHistory";
import { PlayerManager } from "./PlayerManager";
import { PotResolver } from "./PotResolver";
import { TableControls } from "./TableControls";

type LeaderDashboardProps = {
  tableId: string;
  leaderUid: string;
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
  pots: Array<FirebasePot & { id: string }>;
};

export function LeaderDashboard({ tableId, leaderUid, table, players, pots }: LeaderDashboardProps) {
  const connectedPlayers = players.filter((player) => player.connected).length;

  return (
    <main className="leader-page">
      <header className="leader-hero">
        <div>
          <p className="eyebrow">Leader dashboard</p>
          <h1>{table.name}</h1>
        </div>
        <div className="table-code-card">
          <span>Table code</span>
          <strong>{table.code}</strong>
        </div>
        <div className="leader-status-row">
          <span className="status-chip">{table.status}</span>
          <span className="status-chip">{connectedPlayers} connected</span>
          <span className="status-chip">Hand {table.handNumber}</span>
        </div>
      </header>

      <TableControls tableId={tableId} leaderUid={leaderUid} table={table} />
      <PlayerManager tableId={tableId} leaderUid={leaderUid} table={table} players={players} />
      <PotResolver tableId={tableId} leaderUid={leaderUid} pots={pots} players={players} handNumber={table.handNumber} />
      <ActionHistory tableId={tableId} />
    </main>
  );
}
