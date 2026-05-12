import {
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type Transaction,
} from "firebase/firestore";
import { applyAction, calculatePots, distributePots, rebuyPlayer, startHand, type Action, type Player, type Pot, type Table } from "../engine";
import { getFirebaseDb } from "./config";
import { actionsRef, playerRef, playersRef, potRef, potsRef, tableRef } from "./refs";
import type { FirebaseAction, FirebasePlayer, FirebasePot, FirebaseTable } from "./schema";

const seatLockRef = (tableId: string, seatNumber: number) => doc(getFirebaseDb(), "tables", tableId, "seats", String(seatNumber));

type PlayerDoc = { id: string; ref: DocumentReference; data: FirebasePlayer };
type PotDoc = { id: string; ref: DocumentReference; data: FirebasePot };

const assertNonNegative = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} cannot be negative.`);
};

function assertLeader(player: FirebasePlayer | undefined, uid: string): asserts player is FirebasePlayer {
  if (!player || player.uid !== uid || !player.isLeader) throw new Error("Only the table leader can perform this action.");
  if (!player.connected) throw new Error("Leader is disconnected.");
}

const enginePlayerFromDoc = ({ id, data }: PlayerDoc): Player => ({
  id,
  name: data.name,
  seat: data.seatNumber ?? Number.MAX_SAFE_INTEGER,
  stack: data.stack,
  status: data.status,
  currentBet: data.currentBet,
  totalCommitted: data.totalCommittedThisHand,
});

const engineTableFromDocs = (tableId: string, table: FirebaseTable, players: PlayerDoc[], pots: PotDoc[] = []): Table => ({
  id: tableId,
  players: players.filter(({ data }) => data.seatNumber !== null).map(enginePlayerFromDoc),
  dealerSeat: table.dealerSeat,
  smallBlind: table.smallBlind,
  bigBlind: table.bigBlind,
  currentBet: table.highestBet,
  bettingRound: table.currentRound,
  pots: pots.map(({ id, data }) => ({ id, amount: data.amount, eligiblePlayerIds: data.eligiblePlayerIds })),
  handInProgress: table.status === "inHand",
});

const writeActionInTx = (
  tx: Transaction,
  tableId: string,
  table: FirebaseTable,
  playerId: string,
  playerName: string,
  type: FirebaseAction["type"],
  amount: number | null,
  metadata: Record<string, unknown> = {},
): void => {
  const action: FirebaseAction = {
    playerId,
    playerName,
    type,
    amount,
    timestamp: serverTimestamp(),
    handNumber: table.handNumber,
    round: table.currentRound,
    metadata,
  };
  tx.set(doc(actionsRef(tableId)), action);
};

const listPlayerIds = async (tableId: string): Promise<string[]> => {
  const snapshot = await getDocs(playersRef(tableId));
  return snapshot.docs.map((playerDoc) => playerDoc.id);
};

const readPlayersInTx = async (tx: Transaction, tableId: string, ids: string[]): Promise<PlayerDoc[]> => {
  const docs = await Promise.all(
    ids.map(async (id) => {
      const ref = playerRef(tableId, id);
      const snap = await tx.get(ref);
      return snap.exists() ? ({ id, ref, data: snap.data() as FirebasePlayer } satisfies PlayerDoc) : null;
    }),
  );
  return docs.filter((player): player is PlayerDoc => player !== null);
};

const listPotIds = async (tableId: string): Promise<string[]> => {
  const snapshot = await getDocs(potsRef(tableId));
  return snapshot.docs.map((potDoc) => potDoc.id);
};

const readPotsInTx = async (tx: Transaction, tableId: string, ids: string[]): Promise<PotDoc[]> => {
  const docs = await Promise.all(
    ids.map(async (id) => {
      const ref = potRef(tableId, id);
      const snap = await tx.get(ref);
      return snap.exists() ? ({ id, ref, data: snap.data() as FirebasePot } satisfies PotDoc) : null;
    }),
  );
  return docs.filter((pot): pot is PotDoc => pot !== null);
};

const nextTurnSeat = (players: Player[], fromSeat: number | null, highestBet: number): number | null => {
  const candidates = [...players]
    .filter((player) => player.status === "active" && player.stack > 0 && player.currentBet < highestBet)
    .sort((a, b) => a.seat - b.seat);
  if (candidates.length === 0) return null;
  if (fromSeat === null) return candidates[0].seat;
  return candidates.find((player) => player.seat > fromSeat)?.seat ?? candidates[0].seat;
};

const updatePlayersFromEngine = (tx: Transaction, docs: PlayerDoc[], nextPlayers: Player[]): void => {
  for (const playerDoc of docs) {
    const updated = nextPlayers.find((player) => player.id === playerDoc.id);
    if (!updated) continue;
    assertNonNegative(updated.stack, "Stack");
    tx.update(playerDoc.ref, {
      stack: updated.stack,
      currentBet: updated.currentBet,
      totalCommittedThisHand: updated.totalCommitted,
      status: updated.status,
      lastSeenAt: serverTimestamp(),
    });
  }
};

export const createPotsForHand = async (tableId: string, handNumber: number, pots: Pot[]): Promise<void> => {
  const batch = writeBatch(getFirebaseDb());
  pots.forEach((pot, index) => {
    assertNonNegative(pot.amount, "Pot");
    batch.set(potRef(tableId, pot.id), {
      amount: pot.amount,
      eligiblePlayerIds: pot.eligiblePlayerIds,
      winnerIds: [],
      distributed: false,
      handNumber,
      type: index === 0 ? "main" : "side",
      order: index,
    } satisfies FirebasePot);
  });
  await batch.commit();
};

export const sitAtSeatTx = async (tableId: string, uid: string, seatNumber: number): Promise<void> => {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const playerSnap = await tx.get(playerRef(tableId, uid));
    if (!playerSnap.exists()) throw new Error("Player not found.");
    const player = playerSnap.data() as FirebasePlayer;
    const seatSnap = await tx.get(seatLockRef(tableId, seatNumber));

    if (seatNumber < 1 || seatNumber > table.maxPlayers) throw new Error("Seat is outside table capacity.");
    const seatData = seatSnap.exists() ? (seatSnap.data() as { playerId?: string }) : null;
    if (seatData && seatData.playerId !== uid) throw new Error("Seat is already occupied.");
    if (player.seatNumber !== null && player.seatNumber !== seatNumber) throw new Error("Player is already seated.");

    tx.set(seatLockRef(tableId, seatNumber), { playerId: uid, updatedAt: serverTimestamp() });
    tx.update(playerRef(tableId, uid), {
      seatNumber,
      stack: player.stack > 0 ? player.stack : table.startingStack,
      status: table.status === "inHand" ? "waitingNextHand" : "active",
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, uid, player.name, "sit", null, { seatNumber });
  });
};

export const reloadPlayerTx = async (tableId: string, leaderUid: string, playerId: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const targetDoc = players.find(({ id }) => id === playerId);

    assertLeader(leader, leaderUid);
    if (!table.allowReloads) throw new Error("Reloads are disabled for this table.");
    if (!targetDoc) throw new Error("Player not found.");
    if (table.status === "inHand" && targetDoc.data.status !== "broke") throw new Error("Only broke players can be reloaded during an active hand.");

    const engineTable = engineTableFromDocs(tableId, table, players);
    const reloaded = rebuyPlayer(engineTable, playerId, table.reloadAmount);
    const updated = reloaded.players.find((player) => player.id === playerId);
    if (!updated) throw new Error("Player not seated.");
    tx.update(targetDoc.ref, {
      stack: updated.stack,
      status: table.status === "inHand" ? "waitingNextHand" : "active",
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "reload", table.reloadAmount, { targetPlayerId: playerId });
  });
};

export const startHandTx = async (tableId: string, leaderUid: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    assertLeader(leader, leaderUid);
    if (table.status === "inHand") throw new Error("A hand is already in progress.");

    const nextHand = startHand(engineTableFromDocs(tableId, table, players));
    const nextPlayers = nextHand.players;
    const smallBlind = nextPlayers.find((player) => player.totalCommitted === table.smallBlind);
    const bigBlind = nextPlayers.find((player) => player.totalCommitted === table.bigBlind && player.seat !== smallBlind?.seat);
    updatePlayersFromEngine(tx, players, nextPlayers);

    tx.update(tableRef(tableId), {
      status: "inHand",
      handNumber: table.handNumber + 1,
      dealerSeat: nextHand.dealerSeat,
      smallBlindSeat: smallBlind?.seat ?? null,
      bigBlindSeat: bigBlind?.seat ?? null,
      currentTurnSeat: nextTurnSeat(nextPlayers, bigBlind?.seat ?? null, nextHand.currentBet),
      currentRound: "preflop",
      highestBet: nextHand.currentBet,
      potTotal: nextPlayers.reduce((total, player) => total + player.totalCommitted, 0),
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, { ...table, handNumber: table.handNumber + 1 }, leaderUid, leader.name, "startHand", null);
  });
};

export const playerActionTx = async (tableId: string, playerId: string, action: Action): Promise<void> => {
  if (action.playerId !== playerId) throw new Error("Action player does not match the acting player.");
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    if (table.status !== "inHand") throw new Error("No hand is in progress.");

    const players = await readPlayersInTx(tx, tableId, playerIds);
    const actingDoc = players.find(({ id }) => id === playerId);
    if (!actingDoc) throw new Error("Player not found.");
    if (actingDoc.data.seatNumber !== table.currentTurnSeat) throw new Error("It is not this player's turn.");
    if (actingDoc.data.status === "folded") throw new Error("Folded players cannot act.");
    if (actingDoc.data.status === "broke") throw new Error("Broke players cannot act.");
    if (actingDoc.data.status === "allIn") throw new Error("All-in players cannot act again.");

    const nextTable = applyAction(engineTableFromDocs(tableId, table, players), action);
    updatePlayersFromEngine(tx, players, nextTable.players);
    tx.update(tableRef(tableId), {
      highestBet: nextTable.currentBet,
      currentTurnSeat: nextTurnSeat(nextTable.players, actingDoc.data.seatNumber, nextTable.currentBet),
      potTotal: nextTable.players.reduce((total, player) => total + player.totalCommitted, 0),
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, playerId, actingDoc.data.name, action.type, "amount" in action ? action.amount : null);
  });
};

export const checkTx = (tableId: string, playerId: string): Promise<void> => playerActionTx(tableId, playerId, { type: "check", playerId });
export const callTx = (tableId: string, playerId: string): Promise<void> => playerActionTx(tableId, playerId, { type: "call", playerId });
export const raiseTx = (tableId: string, playerId: string, amount: number): Promise<void> =>
  playerActionTx(tableId, playerId, { type: "raise", playerId, amount });
export const allInTx = (tableId: string, playerId: string): Promise<void> => playerActionTx(tableId, playerId, { type: "allIn", playerId });
export const foldTx = (tableId: string, playerId: string): Promise<void> => playerActionTx(tableId, playerId, { type: "fold", playerId });

export const resolvePotsTx = async (tableId: string, leaderUid: string, winnersByPotId: Record<string, string[]>): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  const potIds = await listPotIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const pots = await readPotsInTx(tx, tableId, potIds);
    const currentHandPots = pots.filter((pot) => pot.data.handNumber === table.handNumber);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    assertLeader(leader, leaderUid);
    if (table.status !== "showdown") throw new Error("Pots can only be resolved at showdown.");
    if (currentHandPots.length === 0) throw new Error("There are no pots to resolve for this hand.");
    for (const pot of currentHandPots) {
      assertNonNegative(pot.data.amount, "Pot");
      if (pot.data.distributed) throw new Error("Pot has already been distributed.");
    }

    const resolved = distributePots(engineTableFromDocs(tableId, table, players, currentHandPots), winnersByPotId);
    updatePlayersFromEngine(tx, players, resolved.players);
    for (const pot of currentHandPots) {
      tx.update(pot.ref, {
        winnerIds: winnersByPotId[pot.id] ?? [],
        distributed: true,
      });
    }
    tx.update(tableRef(tableId), {
      status: "showdown",
      currentTurnSeat: null,
      highestBet: 0,
      potTotal: 0,
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "resolvePots", null, { winnersByPotId });
  });
};

export const startNextHandTx = async (tableId: string, leaderUid: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    assertLeader(leader, leaderUid);
    for (const player of players) {
      tx.update(player.ref, {
        currentBet: 0,
        totalCommittedThisHand: 0,
        status: player.data.stack === 0 ? "broke" : player.data.status === "sittingOut" ? "sittingOut" : "active",
      });
    }
    tx.update(tableRef(tableId), {
      status: "waiting",
      smallBlindSeat: null,
      bigBlindSeat: null,
      currentTurnSeat: null,
      currentRound: "preflop",
      highestBet: 0,
      potTotal: 0,
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "startNextHand", null);
  });
};

const bettingRoundOrder = ["preflop", "flop", "turn", "river", "showdown"] as const;

const nextRound = (round: FirebaseTable["currentRound"]): FirebaseTable["currentRound"] => {
  const index = bettingRoundOrder.indexOf(round);
  return bettingRoundOrder[Math.min(index + 1, bettingRoundOrder.length - 1)];
};

const firstActiveSeatAfter = (players: PlayerDoc[], fromSeat: number | null): number | null => {
  const seated = players
    .filter(({ data }) => data.seatNumber !== null && data.stack > 0 && data.status === "active")
    .sort((a, b) => (a.data.seatNumber ?? 0) - (b.data.seatNumber ?? 0));
  if (seated.length === 0) return null;
  if (fromSeat === null) return seated[0].data.seatNumber;
  return seated.find(({ data }) => (data.seatNumber ?? 0) > fromSeat)?.data.seatNumber ?? seated[0].data.seatNumber;
};

const isBettingClosed = (players: PlayerDoc[], highestBet: number): boolean =>
  players.every(({ data }) =>
    data.seatNumber === null ||
    data.status === "folded" ||
    data.status === "allIn" ||
    data.status === "broke" ||
    data.status === "sittingOut" ||
    data.status === "waitingNextHand" ||
    data.currentBet === highestBet,
  );

export const setPlayerSittingOutTx = async (tableId: string, leaderUid: string, playerId: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const target = players.find(({ id }) => id === playerId);
    assertLeader(leader, leaderUid);
    if (!target) throw new Error("Player not found.");
    if (target.data.status === "allIn") throw new Error("All-in players cannot be marked sitting out mid-hand.");

    tx.update(target.ref, {
      status: "sittingOut",
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "sittingOut", null, { targetPlayerId: playerId });
  });
};

export const reactivatePlayerTx = async (tableId: string, leaderUid: string, playerId: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const target = players.find(({ id }) => id === playerId);
    assertLeader(leader, leaderUid);
    if (!target) throw new Error("Player not found.");
    if (target.data.stack <= 0) throw new Error("Broke players must reload before reactivating.");

    tx.update(target.ref, {
      status: table.status === "inHand" ? "waitingNextHand" : "active",
      connected: true,
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "reactivate", null, { targetPlayerId: playerId });
  });
};

export const approveWaitingPlayerTx = async (tableId: string, leaderUid: string, playerId: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const target = players.find(({ id }) => id === playerId);
    assertLeader(leader, leaderUid);
    if (!target) throw new Error("Player not found.");
    if (target.data.stack <= 0) throw new Error("Player needs chips before being approved.");

    tx.update(target.ref, {
      status: table.status === "inHand" ? "waitingNextHand" : "active",
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "approvePlayer", null, { targetPlayerId: playerId });
  });
};

export const softRemovePlayerTx = async (tableId: string, leaderUid: string, playerId: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const target = players.find(({ id }) => id === playerId);
    assertLeader(leader, leaderUid);
    if (!target) throw new Error("Player not found.");
    if (target.data.isLeader) throw new Error("The leader cannot be removed from the table.");

    if (target.data.seatNumber !== null) {
      tx.delete(seatLockRef(tableId, target.data.seatNumber));
    }
    tx.update(target.ref, {
      seatNumber: null,
      status: "sittingOut",
      connected: false,
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "softRemove", null, { targetPlayerId: playerId });
  });
};

export const movePlayerSeatTx = async (tableId: string, leaderUid: string, playerId: string, seatNumber: number): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    const target = players.find(({ id }) => id === playerId);
    assertLeader(leader, leaderUid);
    if (!target) throw new Error("Player not found.");
    if (seatNumber < 1 || seatNumber > table.maxPlayers) throw new Error("Seat is outside table capacity.");

    const seatSnap = await tx.get(seatLockRef(tableId, seatNumber));
    const seatData = seatSnap.exists() ? (seatSnap.data() as { playerId?: string }) : null;
    if (seatData && seatData.playerId !== playerId) throw new Error("Seat is already occupied.");

    if (target.data.seatNumber !== null && target.data.seatNumber !== seatNumber) {
      tx.delete(seatLockRef(tableId, target.data.seatNumber));
    }
    tx.set(seatLockRef(tableId, seatNumber), { playerId, updatedAt: serverTimestamp() });
    tx.update(target.ref, {
      seatNumber,
      lastSeenAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "moveSeat", null, { targetPlayerId: playerId, seatNumber });
  });
};

export const nextBettingRoundTx = async (tableId: string, leaderUid: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    assertLeader(leader, leaderUid);
    if (table.status !== "inHand") throw new Error("No hand is in progress.");
    if (!isBettingClosed(players, table.highestBet)) throw new Error("Betting round is not complete.");
    const round = nextRound(table.currentRound);
    if (round === "showdown") throw new Error("Use End hand to move to showdown.");

    for (const player of players) {
      tx.update(player.ref, { currentBet: 0 });
    }
    tx.update(tableRef(tableId), {
      currentRound: round,
      highestBet: 0,
      currentTurnSeat: firstActiveSeatAfter(players, table.dealerSeat),
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "nextRound", null, { round });
  });
};

export const endHandTx = async (tableId: string, leaderUid: string): Promise<void> => {
  const playerIds = await listPlayerIds(tableId);
  const potIds = await listPotIds(tableId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const tableSnap = await tx.get(tableRef(tableId));
    if (!tableSnap.exists()) throw new Error("Table not found.");
    const table = tableSnap.data() as FirebaseTable;
    const players = await readPlayersInTx(tx, tableId, playerIds);
    const existingPots = await readPotsInTx(tx, tableId, potIds);
    const leader = players.find(({ id }) => id === leaderUid)?.data;
    assertLeader(leader, leaderUid);
    if (table.status !== "inHand") throw new Error("No hand is in progress.");
    if (!isBettingClosed(players, table.highestBet)) throw new Error("Betting round is not complete.");
    if (existingPots.some((pot) => !pot.data.distributed && pot.data.handNumber === table.handNumber)) {
      throw new Error("Current hand pots already exist.");
    }

    const pots = calculatePots(players.map(enginePlayerFromDoc));
    pots.forEach((pot, index) => {
      assertNonNegative(pot.amount, "Pot");
      tx.set(potRef(tableId, `${table.handNumber}-${pot.id}`), {
        amount: pot.amount,
        eligiblePlayerIds: pot.eligiblePlayerIds,
        winnerIds: [],
        distributed: false,
        handNumber: table.handNumber,
        type: index === 0 ? "main" : "side",
        order: index,
      } satisfies FirebasePot);
    });
    tx.update(tableRef(tableId), {
      status: "showdown",
      currentRound: "showdown",
      currentTurnSeat: null,
      highestBet: 0,
      potTotal: pots.reduce((total, pot) => total + pot.amount, 0),
      updatedAt: serverTimestamp(),
    });
    writeActionInTx(tx, tableId, table, leaderUid, leader.name, "endHand", null, { potCount: pots.length });
  });
};
