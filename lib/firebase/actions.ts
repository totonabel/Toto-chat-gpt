import { addDoc, serverTimestamp } from "firebase/firestore";
import { actionsRef } from "./refs";
import type { FirebaseAction, FirebaseActionType } from "./schema";
import type { BettingRound } from "../engine";

type WriteActionLogInput = {
  tableId: string;
  playerId: string;
  playerName: string;
  type: FirebaseActionType;
  amount?: number | null;
  handNumber: number;
  round: BettingRound;
  metadata?: Record<string, unknown>;
};

export const writeActionLog = async ({
  tableId,
  playerId,
  playerName,
  type,
  amount = null,
  handNumber,
  round,
  metadata = {},
}: WriteActionLogInput): Promise<string> => {
  const action: FirebaseAction = {
    playerId,
    playerName,
    type,
    amount,
    timestamp: serverTimestamp(),
    handNumber,
    round,
    metadata,
  };
  const ref = await addDoc(actionsRef(tableId), action);
  return ref.id;
};
