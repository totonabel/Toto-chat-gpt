"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ToastViewport } from "../feedback/ToastViewport";
import { useAuth } from "../../lib/hooks/useAuth";
import { getTableByCode, joinTable, listPlayersOnce } from "../../lib/firebase/table";
import { sitAtSeat } from "../../lib/firebase/player";
import type { FirebaseTable } from "../../lib/firebase/schema";
import { useLocalSession } from "../../lib/hooks/useLocalSession";
import { useToasts } from "../../lib/hooks/useToasts";
import { SeatSelector } from "./SeatSelector";

type FoundTable = {
  id: string;
  data: FirebaseTable;
  occupiedSeats: number[];
};

export function JoinForm() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [foundTable, setFoundTable] = useState<FoundTable | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { persistSession } = useLocalSession();
  const { toasts, pushToast, dismissToast } = useToasts();

  const canSearch = useMemo(() => code.trim().length >= 4 && !loading, [code, loading]);
  const canJoin = Boolean(user && foundTable && selectedSeat && name.trim() && !loading);

  const findTable = async () => {
    setLoading(true);
    setError(null);
    setSelectedSeat(null);
    try {
      const result = await getTableByCode(code.trim());
      if (!result) {
        setFoundTable(null);
        setError("No table found with that code.");
        return;
      }
      const players = await listPlayersOnce(result.id);
      setFoundTable({
        ...result,
        occupiedSeats: players.map(({ data }) => data.seatNumber).filter((seat): seat is number => seat !== null),
      });
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Could not find table.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !foundTable || !selectedSeat) return;

    setLoading(true);
    setError(null);
    try {
      await joinTable(foundTable.id, user.uid, name.trim());
      await sitAtSeat(foundTable.id, user.uid, selectedSeat);
      persistSession({ tableId: foundTable.id, playerId: user.uid, name: name.trim(), seatNumber: selectedSeat, isLeader: false });
      pushToast("Seat saved. Entering table...", "success");
      router.push(`/table/${foundTable.id}/player`);
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : "Could not join table.";
      setError(message);
      pushToast(message.includes("Seat") ? "Seat taken" : message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="join-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">Join table</p>
        <h2>Take a seat</h2>
        <p className="muted">Enter the room code, pick your name, and choose an open seat.</p>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="table-code">Table code</label>
          <input
            id="table-code"
            value={code}
            onChange={(event: { target: { value: string } }) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </div>
        <button type="button" className="secondary-button" onClick={findTable} disabled={!canSearch || authLoading}>
          {loading ? "Searching..." : "Find table"}
        </button>

        <div className="field">
          <label htmlFor="player-name">Your name</label>
          <input id="player-name" value={name} onChange={(event: { target: { value: string } }) => setName(event.target.value)} placeholder="Daniel" autoComplete="name" />
        </div>
      </div>

      {foundTable ? (
        <>
          <div className="player-panel" style={{ padding: 14 }}>
            <strong>{foundTable.data.name}</strong>
            <p className="muted">
              Blinds ${foundTable.data.smallBlind}/${foundTable.data.bigBlind} · Stack ${foundTable.data.startingStack}
            </p>
          </div>
          <SeatSelector
            maxPlayers={foundTable.data.maxPlayers}
            occupiedSeats={foundTable.occupiedSeats}
            selectedSeat={selectedSeat}
            onSelect={setSelectedSeat}
          />
        </>
      ) : null}

      {error || authError ? <div className="error-card">{error ?? authError?.message}</div> : null}

      <button type="submit" className="primary-button" disabled={!canJoin}>
        {loading ? "Joining..." : "Enter table"}
      </button>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </form>
  );
}
