"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { playerRef } from "../firebase/refs";
import type { FirebasePlayer } from "../firebase/schema";

export const useMyPlayer = (tableId: string | null, uid: string | null) => {
  const [player, setPlayer] = useState<(FirebasePlayer & { id: string }) | null>(null);
  const [loading, setLoading] = useState(Boolean(tableId && uid));
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!tableId || !uid) {
      setPlayer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      playerRef(tableId, uid),
      (snapshot) => {
        setPlayer(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as FirebasePlayer) }) : null);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
        window.setTimeout(() => setRetryTick((tick) => tick + 1), 1500);
      },
    );
  }, [tableId, uid, retryTick]);

  return { player, loading, error };
};
