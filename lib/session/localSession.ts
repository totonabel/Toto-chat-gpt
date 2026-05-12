export type LocalPokerSession = {
  tableId: string;
  playerId: string;
  name: string;
  seatNumber: number | null;
  isLeader: boolean;
};

const storageKey = "poker-wallet:last-session";

const canUseStorage = (): boolean => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const saveLocalSession = (session: LocalPokerSession): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(session));
};

export const readLocalSession = (): LocalPokerSession | null => {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Partial<LocalPokerSession>;
    if (!session.tableId || !session.playerId || !session.name) return null;
    return {
      tableId: session.tableId,
      playerId: session.playerId,
      name: session.name,
      seatNumber: typeof session.seatNumber === "number" ? session.seatNumber : null,
      isLeader: Boolean(session.isLeader),
    };
  } catch {
    return null;
  }
};

export const clearLocalSession = (): void => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(storageKey);
};
