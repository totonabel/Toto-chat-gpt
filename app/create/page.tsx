"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ToastViewport } from "../../components/feedback/ToastViewport";
import { createTable } from "../../lib/firebase/table";
import { useAuth } from "../../lib/hooks/useAuth";
import { useLocalSession } from "../../lib/hooks/useLocalSession";
import { useToasts } from "../../lib/hooks/useToasts";

const defaultChipValues = [10, 25, 50, 100, 250, 500, 1000];

export default function CreateTablePage() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const [name, setName] = useState("Friday Poker");
  const [playerName, setPlayerName] = useState("Leader");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [startingStack, setStartingStack] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [allowReloads, setAllowReloads] = useState(true);
  const [reloadAmount, setReloadAmount] = useState(1000);
  const [chipValues, setChipValues] = useState(defaultChipValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { persistSession } = useLocalSession();
  const { toasts, pushToast, dismissToast } = useToasts();

  const toggleChip = (value: number) => {
    setChipValues((current) =>
      current.includes(value) ? current.filter((chip) => chip !== value) : [...current, value].sort((a, b) => a - b),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const table = await createTable({
        uid: user.uid,
        name: name.trim(),
        playerName: playerName.trim(),
        smallBlind,
        bigBlind,
        startingStack,
        maxPlayers,
        allowReloads,
        reloadAmount,
        chipValues,
      });
      persistSession({ tableId: table.tableId, playerId: user.uid, name: playerName.trim(), seatNumber: null, isLeader: true });
      pushToast(`Table ${table.code} created`, "success");
      router.push(`/table/${table.tableId}/leader`);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Could not create table.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell join-page">
      <form className="join-card" onSubmit={submit}>
        <div>
          <p className="eyebrow">Create table</p>
          <h2>Set up the game</h2>
          <p className="muted">Create a realtime table and become the leader automatically.</p>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="table-name">Table name</label>
            <input id="table-name" value={name} onChange={(event: { target: { value: string } }) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="leader-name">Your name</label>
            <input id="leader-name" value={playerName} onChange={(event: { target: { value: string } }) => setPlayerName(event.target.value)} />
          </div>
          <div className="form-pair">
            <div className="field">
              <label htmlFor="max-players">Max players</label>
              <input id="max-players" type="number" min={2} max={10} value={maxPlayers} onChange={(event: { target: { value: string } }) => setMaxPlayers(Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="starting-stack">Starting stack</label>
              <input id="starting-stack" type="number" min={1} value={startingStack} onChange={(event: { target: { value: string } }) => setStartingStack(Number(event.target.value))} />
            </div>
          </div>
          <div className="form-pair">
            <div className="field">
              <label htmlFor="small-blind">Small blind</label>
              <input id="small-blind" type="number" min={1} value={smallBlind} onChange={(event: { target: { value: string } }) => setSmallBlind(Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="big-blind">Big blind</label>
              <input id="big-blind" type="number" min={1} value={bigBlind} onChange={(event: { target: { value: string } }) => setBigBlind(Number(event.target.value))} />
            </div>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={allowReloads} onChange={(event: { target: { checked: boolean } }) => setAllowReloads(event.target.checked)} />
            Allow reloads
          </label>
          <div className="field">
            <label htmlFor="reload-amount">Suggested reload amount</label>
            <input id="reload-amount" type="number" min={1} value={reloadAmount} onChange={(event: { target: { value: string } }) => setReloadAmount(Number(event.target.value))} disabled={!allowReloads} />
          </div>
          <section className="field">
            <label>Available chips</label>
            <div className="chip-choice-grid">
              {defaultChipValues.map((value) => (
                <button key={value} type="button" className={`chip-choice ${chipValues.includes(value) ? "selected" : ""}`} onClick={() => toggleChip(value)}>
                  ${value}
                </button>
              ))}
            </div>
          </section>
        </div>

        {error || authError ? <div className="error-card">{error ?? authError?.message}</div> : null}
        <button type="submit" className="primary-button" disabled={authLoading || submitting || chipValues.length === 0 || bigBlind < smallBlind}>
          {submitting ? "Creating..." : "Create table"}
        </button>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </form>
    </main>
  );
}
