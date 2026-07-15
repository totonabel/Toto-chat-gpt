import type { Player, Pot, Table } from "./types";

const assertNonNegativeMoney = (players: Player[], pots: Pot[] = []): void => {
  for (const player of players) {
    if (player.stack < 0 || player.currentBet < 0 || player.totalCommitted < 0) {
      throw new Error("Las fichas y los pozos no pueden ser negativos.");
    }
  }
  for (const pot of pots) {
    if (pot.amount < 0) throw new Error("Las fichas y los pozos no pueden ser negativos.");
  }
};

export const calculatePots = (players: Player[]): Pot[] => {
  assertNonNegativeMoney(players);

  const committedPlayers = players.filter((player) => player.totalCommitted > 0);
  const levels = [...new Set(committedPlayers.map((player) => player.totalCommitted))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const contributors = committedPlayers.filter((player) => player.totalCommitted >= level);
    const amount = (level - previousLevel) * contributors.length;
    const eligiblePlayerIds = contributors
      .filter((player) => player.status !== "folded")
      .map((player) => player.id);

    if (amount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({ id: `pot-${pots.length + 1}`, amount, eligiblePlayerIds });
    }

    previousLevel = level;
  }

  assertNonNegativeMoney(players, pots);
  return pots;
};

export const distributePots = (table: Table, winnersByPotId: Record<string, string[]>): Table => {
  assertNonNegativeMoney(table.players, table.pots);

  const winnings = new Map<string, number>();
  for (const pot of table.pots) {
    const winners = (winnersByPotId[pot.id] ?? []).filter((winnerId) => pot.eligiblePlayerIds.includes(winnerId));
    if (winners.length === 0) throw new Error(`El pozo ${pot.id} no tiene ganadores elegibles.`);

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount % winners.length;
    for (const winnerId of [...winners].sort()) {
      const extra = remainder > 0 ? 1 : 0;
      winnings.set(winnerId, (winnings.get(winnerId) ?? 0) + share + extra);
      remainder -= extra;
    }
  }

  const players: Player[] = table.players.map((player): Player => {
    const stack = player.stack + (winnings.get(player.id) ?? 0);
    return {
      ...player,
      stack,
      currentBet: 0,
      totalCommitted: 0,
      status: stack === 0 ? "broke" : player.status === "sittingOut" ? "sittingOut" : "active" as Player["status"],
    };
  });

  assertNonNegativeMoney(players);
  return { ...table, players, pots: [], currentBet: 0, bettingRound: "showdown", handInProgress: false };
};
