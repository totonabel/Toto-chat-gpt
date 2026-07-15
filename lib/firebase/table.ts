import { addDoc, getDocs, limit, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getFirebaseDb } from "./config";
import { playerRef, playersRef, tableRef, tablesRef } from "./refs";
import type { CreateTableInput, FirebasePlayer, FirebaseTable } from "./schema";

const generateTableCode = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();

export const createTable = async (input: CreateTableInput): Promise<{ tableId: string; code: string }> => {
  const now = serverTimestamp();
  const code = generateTableCode();
  const table: FirebaseTable = {
    code,
    createdBy: input.uid,
    name: input.name,
    status: "waiting",
    smallBlind: input.smallBlind,
    bigBlind: input.bigBlind,
    startingStack: input.startingStack,
    maxPlayers: input.maxPlayers,
    allowReloads: input.allowReloads,
    reloadAmount: input.reloadAmount,
    chipValues: input.chipValues,
    handNumber: 0,
    dealerSeat: null,
    smallBlindSeat: null,
    bigBlindSeat: null,
    currentTurnSeat: null,
    currentRound: "preflop",
    highestBet: 0,
    potTotal: 0,
    createdAt: now,
    updatedAt: now,
  };

  const tableDoc = await addDoc(tablesRef(), table);
  const leader: FirebasePlayer = {
    uid: input.uid,
    name: input.playerName,
    seatNumber: input.leaderSeatNumber,
    stack: input.startingStack,
    currentBet: 0,
    totalCommittedThisHand: 0,
    status: "active",
    isLeader: true,
    connected: true,
    joinedAt: now,
    lastSeenAt: now,
  };
  await setDoc(playerRef(tableDoc.id, input.uid), leader);
  return { tableId: tableDoc.id, code };
};

export const getTableByCode = async (code: string): Promise<{ id: string; data: FirebaseTable } | null> => {
  const snapshot = await getDocs(query(tablesRef(), where("code", "==", code.toUpperCase()), limit(1)));
  const doc = snapshot.docs[0];
  if (!doc) return null;
  return { id: doc.id, data: doc.data() as FirebaseTable };
};

export const joinTable = async (tableId: string, uid: string, name: string): Promise<void> => {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Mesa no encontrada.");
    const table = tableSnap.data() as FirebaseTable;
    const ref = playerRef(tableId, uid);
    const playerSnap = await tx.get(ref);
    const now = serverTimestamp();

    if (playerSnap.exists()) {
      tx.update(ref, {
        name,
        connected: true,
        lastSeenAt: now,
      });
      return;
    }

    tx.set(ref, {
      uid,
      name,
      seatNumber: null,
      stack: 0,
      currentBet: 0,
      totalCommittedThisHand: 0,
      status: "waitingNextHand",
      isLeader: false,
      connected: true,
      joinedAt: now,
      lastSeenAt: now,
    } satisfies FirebasePlayer);
  });
};

export const listPlayersOnce = async (tableId: string): Promise<Array<{ id: string; data: FirebasePlayer }>> => {
  const snapshot = await getDocs(playersRef(tableId));
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as FirebasePlayer }));
};
