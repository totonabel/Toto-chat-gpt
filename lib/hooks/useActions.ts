"use client";

import { limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { actionsRef } from "../firebase/refs";
import type { FirebaseAction } from "../firebase/schema";

export const useActions = (tableId: string | null, actionLimit = 100) => {
  const [actions, setActions] = useState<Array<FirebaseAction & { id: string }>>([]);
  const [loading, setLoading] = useState(Boolean(tableId));
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!tableId) {
      setActions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      query(actionsRef(tableId), orderBy("timestamp", "desc"), limit(actionLimit)),
      (snapshot) => {
        setActions(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as FirebaseAction) })));
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
        window.setTimeout(() => setRetryTick((tick) => tick + 1), 1500);
      },
    );
  }, [tableId, actionLimit, retryTick]);

  return { actions, loading, error };
};
