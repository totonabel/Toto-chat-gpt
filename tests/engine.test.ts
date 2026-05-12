import {
  addPlayer,
  amountToCall,
  applyAction,
  calculatePots,
  distributePots,
  normalizeBrokePlayers,
  rebuyPlayer,
  rotateDealer,
  startHand,
  type Player,
  type Table,
} from "../lib/engine";

type TestCase = { name: string; run: () => void };
const tests: TestCase[] = [];

const test = (name: string, run: () => void): void => {
  tests.push({ name, run });
};

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const assertEqual = <T>(actual: T, expected: T, message?: string): void => {
  if (!Object.is(actual, expected)) {
    throw new Error(message ?? `Expected ${String(expected)}, received ${String(actual)}`);
  }
};

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
};

const assertThrows = (run: () => void, pattern: RegExp): void => {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `Expected thrown message ${JSON.stringify(message)} to match ${pattern}`);
    return;
  }
  throw new Error("Expected function to throw.");
};

const player = (id: string, seat: number, stack = 1_000, status: Player["status"] = "active"): Player => ({
  id,
  name: id,
  seat,
  stack,
  status,
  currentBet: 0,
  totalCommitted: 0,
});

const table = (players: Player[], overrides: Partial<Table> = {}): Table => ({
  id: "table-1",
  players,
  dealerSeat: null,
  smallBlind: 10,
  bigBlind: 20,
  currentBet: 0,
  bettingRound: "preflop",
  pots: [],
  handInProgress: false,
  ...overrides,
});

const committed = (id: string, seat: number, amount: number, status: Player["status"] = "allIn"): Player => ({
  ...player(id, seat, 0, status),
  currentBet: amount,
  totalCommitted: amount,
});

test("dealer rotates while skipping broke and sitting-out players", () => {
  const result = rotateDealer(
    table([
      player("a", 1, 0, "broke"),
      player("b", 2, 100, "sittingOut"),
      player("c", 3, 100),
      player("d", 4, 100),
    ], { dealerSeat: 1 }),
  );

  assertEqual(result.dealerSeat, 3);
  assertEqual(rotateDealer({ ...result, dealerSeat: 3 }).dealerSeat, 4);
});

test("small blind and big blind are assigned correctly", () => {
  const result = startHand(table([player("dealer", 1), player("sb", 2), player("bb", 3)], { dealerSeat: null }));

  assertEqual(result.dealerSeat, 1);
  assertEqual(result.players.find((p) => p.id === "sb")?.totalCommitted, 10);
  assertEqual(result.players.find((p) => p.id === "bb")?.totalCommitted, 20);
  assertEqual(result.currentBet, 20);
});

test("player cannot check if they must call", () => {
  const subject = table([player("a", 1), player("b", 2)], { currentBet: 20, handInProgress: true });

  assertThrows(() => applyAction(subject, { type: "check", playerId: "a" }), /cannot check/i);
});

test("call pays exactly the required amount", () => {
  const subject = table([player("a", 1), { ...player("b", 2), currentBet: 20, totalCommitted: 20 }], {
    currentBet: 20,
    handInProgress: true,
  });

  const result = applyAction(subject, { type: "call", playerId: "a" });
  const a = result.players.find((p) => p.id === "a");

  assertEqual(amountToCall(result, "a"), 0);
  assertEqual(a?.stack, 980);
  assertEqual(a?.totalCommitted, 20);
});

test("raise pays call plus the raise amount", () => {
  const subject = table([player("a", 1), { ...player("b", 2), currentBet: 20, totalCommitted: 20 }], {
    currentBet: 20,
    handInProgress: true,
  });

  const result = applyAction(subject, { type: "raise", playerId: "a", amount: 40 });
  const a = result.players.find((p) => p.id === "a");

  assertEqual(a?.stack, 940);
  assertEqual(a?.currentBet, 60);
  assertEqual(result.currentBet, 60);
});

test("all-in commits the player's whole stack", () => {
  const result = applyAction(table([player("a", 1, 75), player("b", 2)], { handInProgress: true }), {
    type: "allIn",
    playerId: "a",
  });
  const a = result.players.find((p) => p.id === "a");

  assertEqual(a?.stack, 0);
  assertEqual(a?.totalCommitted, 75);
  assertEqual(a?.status, "allIn");
  assertEqual(result.currentBet, 75);
});

test("fold removes the player from the hand", () => {
  const result = applyAction(table([player("a", 1), player("b", 2)], { handInProgress: true }), {
    type: "fold",
    playerId: "a",
  });

  assertEqual(result.players.find((p) => p.id === "a")?.status, "folded");
});

test("player with $0 becomes broke", () => {
  assertEqual(normalizeBrokePlayers([player("a", 1, 0)])[0].status, "broke");
});

test("simple side pot: A all-in 100, B 300, C 300", () => {
  const pots = calculatePots([committed("a", 1, 100), committed("b", 2, 300, "active"), committed("c", 3, 300, "active")]);

  assertDeepEqual(pots, [
    { id: "pot-1", amount: 300, eligiblePlayerIds: ["a", "b", "c"] },
    { id: "pot-2", amount: 400, eligiblePlayerIds: ["b", "c"] },
  ]);
});

test("multiple side pots: A 50, B 150, C 300, D 300", () => {
  const pots = calculatePots([
    committed("a", 1, 50),
    committed("b", 2, 150),
    committed("c", 3, 300, "active"),
    committed("d", 4, 300, "active"),
  ]);

  assertDeepEqual(pots, [
    { id: "pot-1", amount: 200, eligiblePlayerIds: ["a", "b", "c", "d"] },
    { id: "pot-2", amount: 300, eligiblePlayerIds: ["b", "c", "d"] },
    { id: "pot-3", amount: 300, eligiblePlayerIds: ["c", "d"] },
  ]);
});

test("tie splits the pot", () => {
  const subject = table([committed("a", 1, 100), committed("b", 2, 100)], {
    pots: [{ id: "pot-1", amount: 200, eligiblePlayerIds: ["a", "b"] }],
    handInProgress: true,
  });

  const result = distributePots(subject, { "pot-1": ["a", "b"] });

  assertEqual(result.players.find((p) => p.id === "a")?.stack, 100);
  assertEqual(result.players.find((p) => p.id === "b")?.stack, 100);
  assertDeepEqual(result.pots, []);
});

test("new player enters as waitingNextHand", () => {
  const result = addPlayer(table([player("a", 1), player("b", 2)], { handInProgress: true }), {
    id: "c",
    name: "c",
    seat: 3,
    stack: 500,
  });

  assertEqual(result.players.find((p) => p.id === "c")?.status, "waitingNextHand");
});

test("rebuying a broke player leaves them waitingNextHand during a hand", () => {
  const result = rebuyPlayer(table([player("a", 1, 0, "broke"), player("b", 2)], { handInProgress: true }), "a", 500);

  assertEqual(result.players.find((p) => p.id === "a")?.stack, 500);
  assertEqual(result.players.find((p) => p.id === "a")?.status, "waitingNextHand");
});

test("hand cannot start with fewer than 2 active players with chips", () => {
  assertThrows(() => startHand(table([player("a", 1), player("b", 2, 0, "broke")])), /fewer than 2/i);
});

test("stacks and pots cannot be negative", () => {
  assertThrows(() => normalizeBrokePlayers([{ ...player("a", 1), stack: -1 }]), /negative/i);
  assertThrows(() => calculatePots([{ ...player("a", 1), totalCommitted: -1 }]), /negative/i);
  assertThrows(
    () =>
      distributePots(table([player("a", 1)], { pots: [{ id: "pot-1", amount: -1, eligiblePlayerIds: ["a"] }] }), {
        "pot-1": ["a"],
      }),
    /negative/i,
  );
});

let passed = 0;
for (const { name, run } of tests) {
  run();
  passed += 1;
  console.log(`✓ ${name}`);
}
console.log(`${passed}/${tests.length} tests passed`);
