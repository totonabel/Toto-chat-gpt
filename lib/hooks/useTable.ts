"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { tableRef } from "../firebase/refs";
import type { FirebaseTable } from "../firebase/schema";

export const useTable = (tableId: string | null) => {
  const [table, setTable] = useState<(FirebaseTable & { id: string }) | null>(null);
  const [loading, setLoading] = useState(Boolean(tableId));
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!tableId) {
      setTable(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      tableRef(tableId),
      (snapshot) => {
        setTable(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as FirebaseTable) }) : null);
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

  return { table, loading, error };
};
