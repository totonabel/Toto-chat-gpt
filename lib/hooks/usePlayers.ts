"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { playersRef } from "../firebase/refs";
import type { FirebasePlayer } from "../firebase/schema";

export type PlayerWithId = FirebasePlayer & { id: string };

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
      query(playersRef(tableId), orderBy("seatNumber"), orderBy("joinedAt")),
      (snapshot) => {
        setPlayers(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirebasePlayer) })));
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
