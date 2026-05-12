import { serverTimestamp, updateDoc } from "firebase/firestore";
import { playerRef } from "./refs";
import { reloadPlayerTx, sitAtSeatTx } from "./transactions";

export const sitAtSeat = async (tableId: string, uid: string, seatNumber: number): Promise<void> =>
  sitAtSeatTx(tableId, uid, seatNumber);

export const updatePlayerConnection = async (tableId: string, uid: string, connected: boolean): Promise<void> => {
  await updateDoc(playerRef(tableId, uid), {
    connected,
    lastSeenAt: serverTimestamp(),
  });
};

export const reloadPlayer = async (tableId: string, leaderUid: string, playerId: string): Promise<void> =>
  reloadPlayerTx(tableId, leaderUid, playerId);
