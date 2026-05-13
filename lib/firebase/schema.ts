import type { BettingRound, PlayerStatus } from "../engine";

export type TableStatus = "waiting" | "inHand" | "showdown" | "finished";

export type FirebaseTable = {
  code: string;
  createdBy: string;
  name: string;
  status: TableStatus;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  maxPlayers: number;
  allowReloads: boolean;
  reloadAmount: number;
  chipValues: number[];
  handNumber: number;
  dealerSeat: number | null;
  smallBlindSeat: number | null;
  bigBlindSeat: number | null;
  currentTurnSeat: number | null;
  currentRound: BettingRound;
  highestBet: number;
  potTotal: number;
  createdAt: unknown;
  updatedAt: unknown;
};

export type FirebasePlayer = {
  uid: string;
  name: string;
  seatNumber: number | null;
  stack: number;
  currentBet: number;
  totalCommittedThisHand: number;
  status: PlayerStatus;
  isLeader: boolean;
  connected: boolean;
  joinedAt: unknown;
  lastSeenAt: unknown;
};

export type FirebaseActionType =
  | "check"
  | "call"
  | "raise"
  | "allIn"
  | "fold"
  | "reload"
  | "sit"
  | "startHand"
  | "resolvePots"
  | "startNextHand"
  | "nextRound"
  | "endHand"
  | "finishTable"
  | "sittingOut"
  | "reactivate"
  | "softRemove"
  | "moveSeat"
  | "approvePlayer";

export type FirebaseAction = {
  playerId: string;
  playerName: string;
  type: FirebaseActionType;
  amount: number | null;
  timestamp: unknown;
  handNumber: number;
  round: BettingRound;
  metadata: Record<string, unknown>;
};

export type FirebasePot = {
  amount: number;
  eligiblePlayerIds: string[];
  winnerIds: string[];
  distributed: boolean;
  handNumber: number;
  type: "main" | "side";
  order: number;
};

export type CreateTableInput = {
  uid: string;
  name: string;
  playerName: string;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  maxPlayers: number;
  allowReloads: boolean;
  reloadAmount: number;
  chipValues: number[];
  leaderSeatNumber: number;
};
