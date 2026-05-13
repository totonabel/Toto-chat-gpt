"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { playersRef } from "../firebase/refs";
import type { FirebasePlayer } from "../firebase/schema";

export type PlayerWithId = FirebasePlayer & { id: string };

const sortPlayers = (players: PlayerWithId[]): PlayerWithId[] =>
  [...players].sort((a, b) => {
    if (a.seatNumber === null && b.seatNumber === null) return a.name.localeCompare(b.name);
    if (a.seatNumber === null) return 1;
    if (b.seatNumber === null) return -1;
    return a.seatNumber - b.seatNumber;
  });

export const usePlayers = (tableId: string | null) => {
  const [players, setPlayers] = useState<PlayerWithId[]>([]);
  const [loading, setLoading] = useState(Boolean(tableId));
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!tableId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      playersRef(tableId),
      (snapshot) => {
        setPlayers(sortPlayers(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirebasePlayer) }))));
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
        window.setTimeout(() => setRetryTick((tick) => tick + 1), 1500);
      },
    );
  }, [tableId, retryTick]);

  return { players, loading, error };
};
