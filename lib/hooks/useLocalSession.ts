"use client";

import { useCallback, useEffect, useState } from "react";
import { readLocalSession, saveLocalSession, type LocalPokerSession } from "../session/localSession";

export const useLocalSession = () => {
  const [session, setSession] = useState<LocalPokerSession | null>(null);

  useEffect(() => {
    setSession(readLocalSession());
  }, []);

  const persistSession = useCallback((nextSession: LocalPokerSession) => {
    saveLocalSession(nextSession);
    setSession(nextSession);
  }, []);

  return { session, persistSession };
};
