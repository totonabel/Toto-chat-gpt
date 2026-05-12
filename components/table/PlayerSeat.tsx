import type { CSSProperties } from "react";
import type { PlayerWithId } from "../../lib/hooks/usePlayers";

type PlayerSeatProps = {
  player: PlayerWithId;
  index: number;
  total: number;
  dealerSeat: number | null;
  smallBlindSeat: number | null;
  bigBlindSeat: number | null;
  currentTurnSeat: number | null;
};

export function PlayerSeat({ player, index, total, dealerSeat, smallBlindSeat, bigBlindSeat, currentTurnSeat }: PlayerSeatProps) {
  const angle = `${(360 / Math.max(total, 1)) * index}deg`;
  const isCurrent = player.seatNumber === currentTurnSeat;
  const classes = [
    "player-seat",
    isCurrent ? "current" : "",
    player.status === "folded" ? "folded" : "",
    player.status === "broke" ? "broke" : "",
    !player.connected ? "disconnected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} style={{ "--angle": angle } as CSSProperties} aria-label={`${player.name} seat ${player.seatNumber}`}>
      <div className="seat-badges">
        {player.seatNumber === dealerSeat ? <span className="badge dealer">D</span> : null}
        {player.seatNumber === smallBlindSeat ? <span className="badge sb">SB</span> : null}
        {player.seatNumber === bigBlindSeat ? <span className="badge bb">BB</span> : null}
      </div>
      <div className="seat-name">{player.name}</div>
      <div className="seat-money">${player.stack}</div>
      <div className="seat-bet">Bet ${player.currentBet}</div>
    </article>
  );
}
