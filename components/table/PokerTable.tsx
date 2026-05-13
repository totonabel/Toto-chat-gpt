import type { FirebaseTable } from "../../lib/firebase/schema";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";
import { PlayerSeat } from "./PlayerSeat";
import { PotDisplay } from "./PotDisplay";

type PokerTableProps = {
  table: FirebaseTable & { id: string };
  players: PlayerWithId[];
  potTotal: number;
  compact?: boolean;
};

export function PokerTable({ table, players, potTotal, compact = false }: PokerTableProps) {
  const seatedPlayers = players
    .filter((player) => player.seatNumber !== null)
    .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  return (
    <section className={`poker-table ${compact ? "compact" : ""}`} aria-label="Mesa de póker">
      <div className="felt-table">
        <PotDisplay amount={potTotal} />
      </div>
      {seatedPlayers.map((player, index) => (
        <PlayerSeat
          key={player.id}
          player={player}
          index={index}
          total={seatedPlayers.length}
          dealerSeat={table.dealerSeat}
          smallBlindSeat={table.smallBlindSeat}
          bigBlindSeat={table.bigBlindSeat}
          currentTurnSeat={table.currentTurnSeat}
        />
      ))}
    </section>
  );
}
