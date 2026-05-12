import type { Player, Table } from "./types";

export const canReceiveButtonOrBlind = (player: Player): boolean =>
  player.stack > 0 && player.status !== "broke" && player.status !== "sittingOut" && player.status !== "waitingNextHand";

export const isSeatedInHand = (player: Player): boolean =>
  player.status === "active" || player.status === "allIn" || player.status === "folded";

export const orderBySeat = (players: Player[]): Player[] => [...players].sort((a, b) => a.seat - b.seat);

export const activePlayersWithChips = (players: Player[]): Player[] =>
  orderBySeat(players).filter(canReceiveButtonOrBlind);

export const normalizeBrokePlayers = (players: Player[]): Player[] =>
  players.map((player) => {
    if (player.stack < 0 || player.currentBet < 0 || player.totalCommitted < 0) {
      throw new Error("Stacks, bets and commitments cannot be negative.");
    }

    if (player.stack === 0 && player.status !== "allIn" && player.status !== "folded") {
      return { ...player, status: "broke" };
    }

    return player;
  });

export const nextEligiblePlayer = (players: Player[], fromSeat: number | null): Player | null => {
  const eligible = activePlayersWithChips(players);
  if (eligible.length === 0) return null;
  if (fromSeat === null) return eligible[0];

  return eligible.find((player) => player.seat > fromSeat) ?? eligible[0];
};

export const rotateDealer = (table: Table): Table => {
  const players = normalizeBrokePlayers(table.players);
  const nextDealer = nextEligiblePlayer(players, table.dealerSeat);

  if (!nextDealer) {
    throw new Error("Cannot rotate dealer without eligible players.");
  }

  return { ...table, players, dealerSeat: nextDealer.seat };
};

export const addPlayer = (table: Table, player: Omit<Player, "status" | "currentBet" | "totalCommitted">): Table => {
  if (table.players.some((existing) => existing.id === player.id)) {
    throw new Error("Player id already exists at this table.");
  }
  if (table.players.some((existing) => existing.seat === player.seat)) {
    throw new Error("Seat is already occupied.");
  }
  if (player.stack < 0) {
    throw new Error("Stack cannot be negative.");
  }

  const status = table.handInProgress ? "waitingNextHand" : player.stack === 0 ? "broke" : "active";
  return {
    ...table,
    players: [...table.players, { ...player, status, currentBet: 0, totalCommitted: 0 }],
  };
};

export const rebuyPlayer = (table: Table, playerId: string, amount: number): Table => {
  if (amount <= 0) {
    throw new Error("Rebuy amount must be positive.");
  }

  return {
    ...table,
    players: table.players.map((player) => {
      if (player.id !== playerId) return player;
      return {
        ...player,
        stack: player.stack + amount,
        status: table.handInProgress ? "waitingNextHand" : "active",
      };
    }),
  };
};
