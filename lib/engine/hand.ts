import type { Table } from "./types";
import { activePlayersWithChips, nextEligiblePlayer, normalizeBrokePlayers } from "./players";
import { postBlind } from "./betting";
import { calculatePots } from "./pots";

export const startHand = (table: Table): Table => {
  const normalizedPlayers = normalizeBrokePlayers(table.players).map((player) => ({
    ...player,
    currentBet: 0,
    totalCommitted: 0,
    status: player.status === "waitingNextHand" && player.stack > 0 ? "active" : player.status,
  }));
  const eligible = activePlayersWithChips(normalizedPlayers);

  if (eligible.length < 2) {
    throw new Error("No se puede iniciar una mano con menos de 2 jugadores activos con fichas.");
  }

  const dealer = nextEligiblePlayer(normalizedPlayers, table.dealerSeat);
  if (!dealer) throw new Error("No se pudo elegir un dealer.");

  const smallBlindPlayer = eligible.length === 2 ? dealer : nextEligiblePlayer(normalizedPlayers, dealer.seat);
  if (!smallBlindPlayer) throw new Error("No se pudo asignar la ciega chica.");
  const bigBlindPlayer = nextEligiblePlayer(normalizedPlayers, smallBlindPlayer.seat);
  if (!bigBlindPlayer) throw new Error("No se pudo asignar la ciega grande.");

  let nextTable: Table = {
    ...table,
    players: normalizedPlayers,
    dealerSeat: dealer.seat,
    currentBet: 0,
    bettingRound: "preflop",
    pots: [],
    handInProgress: true,
  };

  nextTable = postBlind(nextTable, smallBlindPlayer.id, nextTable.smallBlind);
  nextTable = postBlind(nextTable, bigBlindPlayer.id, nextTable.bigBlind);
  return nextTable;
};

export const finishBettingRound = (table: Table): Table => ({
  ...table,
  pots: calculatePots(table.players),
  players: table.players.map((player) => ({ ...player, currentBet: 0 })),
  currentBet: 0,
});
