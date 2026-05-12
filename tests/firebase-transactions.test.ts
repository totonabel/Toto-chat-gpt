export {};

type Status = "active" | "folded" | "allIn" | "broke" | "waitingNextHand" | "sittingOut";

type SimPlayer = {
  id: string;
  uid: string;
  name: string;
  seatNumber: number | null;
  stack: number;
  status: Status;
  isLeader: boolean;
  connected: boolean;
};

type SimPot = {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
  winnerIds: string[];
  distributed: boolean;
};

type SimTable = {
  maxPlayers: number;
  reloadAmount: number;
  status: "waiting" | "inHand" | "showdown";
  currentTurnSeat: number | null;
  players: Map<string, SimPlayer>;
  seatLocks: Map<number, string>;
  pots: Map<string, SimPot>;
  actions: string[];
};

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const assertEqual = <T>(actual: T, expected: T, message?: string): void => {
  if (!Object.is(actual, expected)) throw new Error(message ?? `Expected ${String(expected)}, received ${String(actual)}`);
};

const assertThrows = (run: () => void, pattern: RegExp): void => {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `Expected ${JSON.stringify(message)} to match ${pattern}`);
    return;
  }
  throw new Error("Expected function to throw.");
};

const createSimTable = (): SimTable => ({
  maxPlayers: 9,
  reloadAmount: 500,
  status: "inHand",
  currentTurnSeat: 1,
  players: new Map([
    ["leader", { id: "leader", uid: "leader", name: "Leader", seatNumber: null, stack: 1_000, status: "active", isLeader: true, connected: true }],
    ["a", { id: "a", uid: "a", name: "A", seatNumber: 1, stack: 300, status: "active", isLeader: false, connected: true }],
    ["b", { id: "b", uid: "b", name: "B", seatNumber: 2, stack: 300, status: "active", isLeader: false, connected: true }],
  ]),
  seatLocks: new Map([[1, "a"], [2, "b"]]),
  pots: new Map(),
  actions: [],
});

const requireLeader = (table: SimTable, uid: string): SimPlayer => {
  const leader = table.players.get(uid);
  if (!leader?.isLeader) throw new Error("Only the table leader can perform this action.");
  return leader;
};

const sitAtSeatSim = (table: SimTable, uid: string, seatNumber: number): void => {
  const player = table.players.get(uid);
  if (!player) throw new Error("Player not found.");
  if (seatNumber < 1 || seatNumber > table.maxPlayers) throw new Error("Seat is outside table capacity.");
  const lockedBy = table.seatLocks.get(seatNumber);
  if (lockedBy && lockedBy !== uid) throw new Error("Seat is already occupied.");
  if (player.seatNumber !== null && player.seatNumber !== seatNumber) throw new Error("Player is already seated.");

  table.seatLocks.set(seatNumber, uid);
  player.seatNumber = seatNumber;
  player.status = table.status === "inHand" ? "waitingNextHand" : "active";
  table.actions.push(`sit:${uid}:${seatNumber}`);
};

const playerActionSim = (table: SimTable, playerId: string): void => {
  const player = table.players.get(playerId);
  if (!player) throw new Error("Player not found.");
  if (player.seatNumber !== table.currentTurnSeat) throw new Error("It is not this player's turn.");
  if (player.status === "folded") throw new Error("Folded players cannot act.");
  if (player.status === "broke") throw new Error("Broke players cannot act.");
  if (player.status === "allIn") throw new Error("All-in players cannot act again.");
  table.actions.push(`act:${playerId}`);
};

const reloadPlayerSim = (table: SimTable, leaderUid: string, playerId: string): void => {
  requireLeader(table, leaderUid);
  const player = table.players.get(playerId);
  if (!player) throw new Error("Player not found.");
  if (table.status === "inHand" && player.status !== "broke") throw new Error("Only broke players can be reloaded during an active hand.");
  player.stack += table.reloadAmount;
  player.status = table.status === "inHand" ? "waitingNextHand" : "active";
  table.actions.push(`reload:${leaderUid}:${playerId}`);
};

const resolvePotsSim = (table: SimTable, leaderUid: string, winnersByPotId: Record<string, string[]>): void => {
  requireLeader(table, leaderUid);
  for (const [potId, pot] of table.pots) {
    if (pot.amount < 0) throw new Error("Pot cannot be negative.");
    if (pot.distributed) throw new Error("Pot has already been distributed.");
    const winners = winnersByPotId[potId] ?? [];
    if (winners.length === 0) throw new Error("Pot has no winners.");
    const share = Math.floor(pot.amount / winners.length);
    for (const winnerId of winners) {
      const winner = table.players.get(winnerId);
      if (!winner || !pot.eligiblePlayerIds.includes(winnerId)) throw new Error("Winner is not eligible for this pot.");
      winner.stack += share;
    }
    pot.winnerIds = winners;
    pot.distributed = true;
  }
  table.actions.push(`resolve:${leaderUid}`);
};

const reconnectSim = (table: SimTable, uid: string, name: string): void => {
  const existing = table.players.get(uid);
  if (existing) {
    existing.connected = true;
    existing.name = name;
    table.actions.push(`reconnect:${uid}`);
    return;
  }
  table.players.set(uid, { id: uid, uid, name, seatNumber: null, stack: 0, status: "waitingNextHand", isLeader: false, connected: true });
  table.actions.push(`join:${uid}`);
};

const tests: Array<{ name: string; run: () => void }> = [];
const test = (name: string, run: () => void): void => {
  tests.push({ name, run });
};

test("two players cannot sit in the same seat", () => {
  const table = createSimTable();
  table.players.set("c", { id: "c", uid: "c", name: "C", seatNumber: null, stack: 0, status: "waitingNextHand", isLeader: false, connected: true });
  sitAtSeatSim(table, "c", 3);
  table.players.set("d", { id: "d", uid: "d", name: "D", seatNumber: null, stack: 0, status: "waitingNextHand", isLeader: false, connected: true });
  assertThrows(() => sitAtSeatSim(table, "d", 3), /occupied/i);
});

test("out-of-turn player cannot act", () => {
  assertThrows(() => playerActionSim(createSimTable(), "b"), /turn/i);
});

test("folded player cannot act", () => {
  const table = createSimTable();
  table.players.get("a")!.status = "folded";
  assertThrows(() => playerActionSim(table, "a"), /folded/i);
});

test("broke player cannot act", () => {
  const table = createSimTable();
  table.players.get("a")!.status = "broke";
  table.players.get("a")!.stack = 0;
  assertThrows(() => playerActionSim(table, "a"), /broke/i);
});

test("all-in player cannot act again", () => {
  const table = createSimTable();
  table.players.get("a")!.status = "allIn";
  assertThrows(() => playerActionSim(table, "a"), /all-in/i);
});

test("leader reloads a broke player", () => {
  const table = createSimTable();
  table.players.get("a")!.status = "broke";
  table.players.get("a")!.stack = 0;
  reloadPlayerSim(table, "leader", "a");
  assertEqual(table.players.get("a")!.stack, 500);
  assertEqual(table.players.get("a")!.status, "waitingNextHand");
});

test("non-leader cannot reload", () => {
  const table = createSimTable();
  table.players.get("a")!.status = "broke";
  assertThrows(() => reloadPlayerSim(table, "b", "a"), /leader/i);
});

test("leader distributes side pots", () => {
  const table = createSimTable();
  table.pots.set("pot-1", { id: "pot-1", amount: 300, eligiblePlayerIds: ["a", "b"], winnerIds: [], distributed: false });
  resolvePotsSim(table, "leader", { "pot-1": ["a"] });
  assertEqual(table.players.get("a")!.stack, 600);
  assertEqual(table.pots.get("pot-1")!.distributed, true);
});

test("leader cannot distribute the same pot twice", () => {
  const table = createSimTable();
  table.pots.set("pot-1", { id: "pot-1", amount: 300, eligiblePlayerIds: ["a", "b"], winnerIds: [], distributed: false });
  resolvePotsSim(table, "leader", { "pot-1": ["a"] });
  assertThrows(() => resolvePotsSim(table, "leader", { "pot-1": ["a"] }), /already/i);
});

test("disconnected player reconnects without duplication", () => {
  const table = createSimTable();
  table.players.get("a")!.connected = false;
  reconnectSim(table, "a", "A returned");
  assertEqual(table.players.size, 3);
  assertEqual(table.players.get("a")!.connected, true);
  assertEqual(table.players.get("a")!.name, "A returned");
});

let passed = 0;
for (const { name, run } of tests) {
  run();
  passed += 1;
  console.log(`✓ ${name}`);
}
console.log(`${passed}/${tests.length} firebase transaction simulations passed`);
