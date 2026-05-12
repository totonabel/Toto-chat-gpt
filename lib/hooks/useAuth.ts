"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { signInAnonymous, subscribeToAuth } from "../firebase/auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) setError(null);
    });

    signInAnonymous().catch((authError: Error) => {
      setError(authError);
      setLoading(false);
      window.setTimeout(() => setRetryTick((tick) => tick + 1), 1500);
    });

    return unsubscribe;
  }, [retryTick]);

  return { user, loading, error };
};
