export type PlayerStatus =
  | "active"
  | "sittingOut"
  | "waitingNextHand"
  | "folded"
  | "allIn"
  | "broke";

export type BettingRound = "preflop" | "flop" | "turn" | "river" | "showdown";

export type Action =
  | { type: "check"; playerId: string }
  | { type: "call"; playerId: string }
  | { type: "raise"; playerId: string; amount: number }
  | { type: "allIn"; playerId: string }
  | { type: "fold"; playerId: string };

export type Player = {
  id: string;
  name: string;
  seat: number;
  stack: number;
  status: PlayerStatus;
  currentBet: number;
  totalCommitted: number;
};

export type Pot = {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
};

export type Table = {
  id: string;
  players: Player[];
  dealerSeat: number | null;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  bettingRound: BettingRound;
  pots: Pot[];
  handInProgress: boolean;
};
