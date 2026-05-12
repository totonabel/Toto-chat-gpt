"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ToastViewport } from "../../components/feedback/ToastViewport";
import { SeatSelector } from "../../components/join/SeatSelector";
import { createTable } from "../../lib/firebase/table";
import { useAuth } from "../../lib/hooks/useAuth";
import { useLocalSession } from "../../lib/hooks/useLocalSession";
import { useToasts } from "../../lib/hooks/useToasts";

const defaultChipValues = [250, 500, 1000, 2000];

export default function CreateTablePage() {
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const [name, setName] = useState("Mesa de póker");
  const [playerName, setPlayerName] = useState("Líder");
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [leaderSeatNumber, setLeaderSeatNumber] = useState(1);
  const [startingStack, setStartingStack] = useState(2000);
  const [smallBlind, setSmallBlind] = useState(250);
  const [bigBlind, setBigBlind] = useState(500);
  const [allowReloads, setAllowReloads] = useState(true);
  const [reloadAmount, setReloadAmount] = useState(2000);
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
        leaderSeatNumber,
      });
      persistSession({ tableId: table.tableId, playerId: user.uid, name: playerName.trim(), seatNumber: leaderSeatNumber, isLeader: true });
      pushToast(`Mesa ${table.code} creada`, "success");
      router.push(`/table/${table.tableId}/leader`);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "No se pudo crear la mesa.";
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
          <p className="eyebrow">Crear mesa</p>
          <h2>Configurá la partida</h2>
          <p className="muted">Creá una mesa en tiempo real. Vas a ser líder y también jugador desde el asiento que elijas.</p>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="table-name">Nombre de la mesa</label>
            <input id="table-name" value={name} onChange={(event: { target: { value: string } }) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="leader-name">Tu nombre</label>
            <input id="leader-name" value={playerName} onChange={(event: { target: { value: string } }) => setPlayerName(event.target.value)} />
          </div>
          <div className="form-pair">
            <div className="field">
              <label htmlFor="max-players">Cantidad máxima de jugadores</label>
              <input id="max-players" type="number" min={2} max={10} value={maxPlayers} onChange={(event: { target: { value: string } }) => {
                const nextMax = Number(event.target.value);
                setMaxPlayers(nextMax);
                setLeaderSeatNumber((seat) => Math.min(seat, nextMax));
              }} />
            </div>
            <div className="field">
              <label htmlFor="starting-stack">Fichas iniciales</label>
              <input id="starting-stack" type="number" min={1} value={startingStack} onChange={(event: { target: { value: string } }) => setStartingStack(Number(event.target.value))} />
            </div>
          </div>

          <div className="field">
            <label>Elegí tu asiento como líder/jugador</label>
            <SeatSelector
              maxPlayers={maxPlayers}
              occupiedSeats={[]}
              selectedSeat={leaderSeatNumber}
              onSelect={setLeaderSeatNumber}
              />
          </div>

          <div className="form-pair">
            <div className="field">
              <label htmlFor="small-blind">Ciega chica</label>
              <input id="small-blind" type="number" min={1} value={smallBlind} onChange={(event: { target: { value: string } }) => setSmallBlind(Number(event.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="big-blind">Ciega grande</label>
              <input id="big-blind" type="number" min={1} value={bigBlind} onChange={(event: { target: { value: string } }) => setBigBlind(Number(event.target.value))} />
            </div>
          </div>

          <label className="toggle-row">
            <input type="checkbox" checked={allowReloads} onChange={(event: { target: { checked: boolean } }) => setAllowReloads(event.target.checked)} />
            Permitir recargar fichas
          </label>
          <div className="field">
            <label htmlFor="reload-amount">Monto de recarga</label>
            <input id="reload-amount" type="number" min={1} value={reloadAmount} onChange={(event: { target: { value: string } }) => setReloadAmount(Number(event.target.value))} disabled={!allowReloads} />
          </div>

          <div className="field">
            <label>Valores de fichas disponibles</label>
            <div className="chip-toggle-grid">
              {defaultChipValues.map((chip) => (
                <button key={chip} type="button" className={`chip-toggle ${chipValues.includes(chip) ? "selected" : ""}`} onClick={() => toggleChip(chip)}>
                  ${chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error || authError ? <div className="error-card">{error ?? authError?.message}</div> : null}
        <button className="primary-button" type="submit" disabled={submitting || authLoading || chipValues.length === 0 || !leaderSeatNumber || bigBlind < smallBlind}>
          {submitting ? "Creando..." : "Crear mesa"}
        </button>
      </form>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
