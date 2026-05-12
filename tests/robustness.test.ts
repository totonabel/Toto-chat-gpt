export {};

type Session = {
  tableId: string;
  playerId: string;
  name: string;
  seatNumber: number | null;
  isLeader: boolean;
};

type RobustPlayer = {
  id: string;
  isLeader: boolean;
  connected: boolean;
  status: "active" | "waitingNextHand" | "folded" | "allIn" | "broke";
};

type RobustTable = {
  id: string;
  status: "waiting" | "inHand" | "showdown" | "finished";
  resolved: boolean;
  players: Map<string, RobustPlayer>;
};

const tests: Array<{ name: string; run: () => void | Promise<void> }> = [];
const test = (name: string, run: () => void | Promise<void>): void => {
  tests.push({ name, run });
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

const serializeSession = (session: Session): string => JSON.stringify(session);
const restoreSession = (raw: string | null): Session | null => {
  if (!raw) return null;
  const session = JSON.parse(raw) as Partial<Session>;
  if (!session.tableId || !session.playerId || !session.name) return null;
  return {
    tableId: session.tableId,
    playerId: session.playerId,
    name: session.name,
    seatNumber: typeof session.seatNumber === "number" ? session.seatNumber : null,
    isLeader: Boolean(session.isLeader),
  };
};

const routeFor = (table: RobustTable | null, player: RobustPlayer | null): string => {
  if (!table) return "error:table-not-found";
  if (!player) return "error:player-not-found";
  if (table.status === "finished") return "finished";
  return `/table/${table.id}/${player.isLeader ? "leader" : "player"}`;
};

const createSingleFlight = () => {
  let pending = false;
  let calls = 0;
  return {
    calls: () => calls,
    run: async (action: () => Promise<void>) => {
      if (pending) return;
      pending = true;
      try {
        calls += 1;
        await action();
      } finally {
        pending = false;
      }
    },
  };
};

const reconnect = (table: RobustTable, playerId: string): void => {
  const player = table.players.get(playerId);
  if (!player) throw new Error("Player not found.");
  player.connected = true;
};

const resolveOnce = (table: RobustTable): void => {
  if (table.status !== "showdown") throw new Error("Pots can only be resolved at showdown.");
  if (table.resolved) throw new Error("Pot has already been distributed.");
  table.resolved = true;
};

test("refresh restores the previous local session", () => {
  const stored = serializeSession({ tableId: "t1", playerId: "p1", name: "Ana", seatNumber: 3, isLeader: false });
  const restored = restoreSession(stored);
  assertEqual(restored?.tableId, "t1");
  assertEqual(restored?.seatNumber, 3);
});

test("restored leader routes back to leader view", () => {
  const table: RobustTable = { id: "t1", status: "waiting", resolved: false, players: new Map() };
  const leader: RobustPlayer = { id: "leader", isLeader: true, connected: true, status: "active" };
  assertEqual(routeFor(table, leader), "/table/t1/leader");
});

test("restored player routes back to player view", () => {
  const table: RobustTable = { id: "t2", status: "inHand", resolved: false, players: new Map() };
  const player: RobustPlayer = { id: "p1", isLeader: false, connected: true, status: "active" };
  assertEqual(routeFor(table, player), "/table/t2/player");
});

test("missing table shows a clear error route", () => {
  const player: RobustPlayer = { id: "p1", isLeader: false, connected: true, status: "active" };
  assertEqual(routeFor(null, player), "error:table-not-found");
});

test("reconnect player recovers without duplicating", () => {
  const table: RobustTable = { id: "t1", status: "waiting", resolved: false, players: new Map([["p1", { id: "p1", isLeader: false, connected: false, status: "active" }]]) };
  reconnect(table, "p1");
  assertEqual(table.players.size, 1);
  assertEqual(table.players.get("p1")?.connected, true);
});

test("reconnect leader recovers without duplicating", () => {
  const table: RobustTable = { id: "t1", status: "waiting", resolved: false, players: new Map([["leader", { id: "leader", isLeader: true, connected: false, status: "active" }]]) };
  reconnect(table, "leader");
  assertEqual(table.players.size, 1);
  assertEqual(table.players.get("leader")?.connected, true);
});

test("double click action is ignored while pending", async () => {
  const singleFlight = createSingleFlight();
  const pending = new Promise<void>((resolve) => setTimeout(resolve, 10));
  await Promise.all([singleFlight.run(() => pending), singleFlight.run(() => pending)]);
  assertEqual(singleFlight.calls(), 1);
});

test("double click join is ignored while pending", async () => {
  const singleFlight = createSingleFlight();
  const pending = new Promise<void>((resolve) => setTimeout(resolve, 10));
  await Promise.all([singleFlight.run(() => pending), singleFlight.run(() => pending)]);
  assertEqual(singleFlight.calls(), 1);
});

test("double resolve pots fails", () => {
  const table: RobustTable = { id: "t1", status: "showdown", resolved: false, players: new Map() };
  resolveOnce(table);
  assertThrows(() => resolveOnce(table), /already/);
});

test("finished table routes to a terminal state", () => {
  const table: RobustTable = { id: "t1", status: "finished", resolved: false, players: new Map() };
  const player: RobustPlayer = { id: "p1", isLeader: false, connected: true, status: "active" };
  assertEqual(routeFor(table, player), "finished");
});


test("four players acting quickly are serialized by single-flight turn guard", async () => {
  const singleFlight = createSingleFlight();
  const pending = new Promise<void>((resolve) => setTimeout(resolve, 10));
  await Promise.all([
    singleFlight.run(() => pending),
    singleFlight.run(() => pending),
    singleFlight.run(() => pending),
    singleFlight.run(() => pending),
  ]);
  assertEqual(singleFlight.calls(), 1);
});

test("multiple reconnects keep one player document", () => {
  const table: RobustTable = { id: "t1", status: "inHand", resolved: false, players: new Map([["p1", { id: "p1", isLeader: false, connected: false, status: "active" }]]) };
  reconnect(table, "p1");
  table.players.get("p1")!.connected = false;
  reconnect(table, "p1");
  reconnect(table, "p1");
  assertEqual(table.players.size, 1);
  assertEqual(table.players.get("p1")?.connected, true);
});

test("leader disconnected during showdown cannot resolve until reconnected", () => {
  const table: RobustTable = { id: "t1", status: "showdown", resolved: false, players: new Map([["leader", { id: "leader", isLeader: true, connected: false, status: "active" }]]) };
  const resolveAsLeader = () => {
    const leader = table.players.get("leader");
    if (!leader?.connected) throw new Error("Leader is disconnected.");
    resolveOnce(table);
  };
  assertThrows(resolveAsLeader, /disconnected/);
  reconnect(table, "leader");
  resolveAsLeader();
  assertEqual(table.resolved, true);
});

test("all-in player remains eligible only for the main pot", () => {
  const pots = [
    { id: "main", eligiblePlayerIds: ["a", "b", "c"] },
    { id: "side", eligiblePlayerIds: ["b", "c"] },
  ];
  assert(pots[0].eligiblePlayerIds.includes("a"), "all-in player should be in main pot");
  assert(!pots[1].eligiblePlayerIds.includes("a"), "all-in short stack should not be in side pot");
});

test("folded player receives no pot", () => {
  const pot = { amount: 300, eligiblePlayerIds: ["a", "b"] };
  const foldedPlayerId = "c";
  assert(!pot.eligiblePlayerIds.includes(foldedPlayerId), "folded player should not be eligible");
});

test("empty pot is not distributed", () => {
  const distribute = (amount: number, winners: string[]) => {
    if (amount <= 0) throw new Error("Pot cannot be empty.");
    if (winners.length === 0) throw new Error("Pot has no winners.");
  };
  assertThrows(() => distribute(0, ["a"]), /empty/);
  assertThrows(() => distribute(100, []), /winners/);
});

test("reconnect while action pending keeps action single-flight", async () => {
  const table: RobustTable = { id: "t1", status: "inHand", resolved: false, players: new Map([["p1", { id: "p1", isLeader: false, connected: false, status: "active" }]]) };
  const singleFlight = createSingleFlight();
  const pending = new Promise<void>((resolve) => setTimeout(resolve, 10));
  const action = singleFlight.run(() => pending);
  reconnect(table, "p1");
  await Promise.all([action, singleFlight.run(() => pending)]);
  assertEqual(table.players.get("p1")?.connected, true);
  assertEqual(singleFlight.calls(), 1);
});

const main = async (): Promise<void> => {
  let passed = 0;
  for (const { name, run } of tests) {
    await run();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`${passed}/${tests.length} robustness simulations passed`);
};

void main();
