import type { Action, Player, Table } from "./types";
import { normalizeBrokePlayers } from "./players";

const assertPositive = (amount: number, label: string): void => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} debe ser positivo.`);
  }
};

export const amountToCall = (table: Table, playerId: string): number => {
  const player = table.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Jugador no encontrado.");
  return Math.max(0, table.currentBet - player.currentBet);
};

const commitChips = (player: Player, amount: number): Player => {
  if (amount < 0) throw new Error("No se puede comprometer un monto negativo.");
  const committed = Math.min(amount, player.stack);
  const nextStack = player.stack - committed;
  return {
    ...player,
    stack: nextStack,
    currentBet: player.currentBet + committed,
    totalCommitted: player.totalCommitted + committed,
    status: nextStack === 0 ? "allIn" : player.status,
  };
};

export const postBlind = (table: Table, playerId: string, amount: number): Table => {
  assertPositive(amount, "Blind");
  let nextCurrentBet = table.currentBet;
  const players = table.players.map((player) => {
    if (player.id !== playerId) return player;
    const updated = commitChips(player, amount);
    nextCurrentBet = Math.max(nextCurrentBet, updated.currentBet);
    return updated;
  });

  return { ...table, players: normalizeBrokePlayers(players), currentBet: nextCurrentBet };
};

export const applyAction = (table: Table, action: Action): Table => {
  const actingPlayer = table.players.find((player) => player.id === action.playerId);
  if (!actingPlayer) throw new Error("Jugador no encontrado.");
  if (actingPlayer.status !== "active") throw new Error("Solo los jugadores activos pueden actuar.");

  const toCall = amountToCall(table, action.playerId);
  let nextCurrentBet = table.currentBet;

  const players: Player[] = table.players.map((player): Player => {
    if (player.id !== action.playerId) return player;

    switch (action.type) {
      case "check":
        if (toCall > 0) throw new Error("El jugador no puede pasar si hay una apuesta que igualar.");
        return player;
      case "call":
        return commitChips(player, toCall);
      case "raise": {
        assertPositive(action.amount, "Raise");
        const updated = commitChips(player, toCall + action.amount);
        if (updated.currentBet <= table.currentBet && updated.status !== "allIn") {
          throw new Error("La suba debe incrementar la apuesta actual.");
        }
        nextCurrentBet = Math.max(nextCurrentBet, updated.currentBet);
        return updated;
      }
      case "allIn": {
        const updated = commitChips(player, player.stack);
        nextCurrentBet = Math.max(nextCurrentBet, updated.currentBet);
        return updated;
      }
      case "fold":
        return { ...player, status: "folded" as const };
      default:
        return player;
    }
  });

  return { ...table, players: normalizeBrokePlayers(players), currentBet: nextCurrentBet };
};
