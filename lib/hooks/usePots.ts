"use client";

import { onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { potsRef } from "../firebase/refs";
import type { FirebasePot } from "../firebase/schema";

export const usePots = (tableId: string | null) => {
  const [pots, setPots] = useState<Array<FirebasePot & { id: string }>>([]);
  const [loading, setLoading] = useState(Boolean(tableId));
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!tableId) {
      setPots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      query(potsRef(tableId), orderBy("handNumber"), orderBy("order")),
      (snapshot) => {
        setPots(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirebasePot) })));
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

  return { pots, loading, error };
};
