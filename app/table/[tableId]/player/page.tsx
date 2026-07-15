"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FirebaseErrorState } from "../../../../components/feedback/FirebaseErrorState";
import { useParams, useRouter } from "next/navigation";
import { ConnectionBanner } from "../../../../components/feedback/ConnectionBanner";
import { ToastViewport } from "../../../../components/feedback/ToastViewport";
import { DebugPanel } from "../../../../components/debug/DebugPanel";
import { PlayerGameView } from "../../../../components/table/PlayerGameView";
import { PostGameView } from "../../../../components/table/PostGameView";
import { updatePlayerConnection } from "../../../../lib/firebase/player";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useMyPlayer } from "../../../../lib/hooks/useMyPlayer";
import { usePlayers } from "../../../../lib/hooks/usePlayers";
import { usePots } from "../../../../lib/hooks/usePots";
import { useTable } from "../../../../lib/hooks/useTable";
import { useLocalSession } from "../../../../lib/hooks/useLocalSession";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";
import { useToasts } from "../../../../lib/hooks/useToasts";
import { clearLocalSession } from "../../../../lib/session/localSession";

export default function PlayerTablePage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const { user, loading: authLoading, error: authError } = useAuth();
  const { table, loading: tableLoading, error: tableError } = useTable(tableId);
  const { players, loading: playersLoading } = usePlayers(tableId);
  const { pots } = usePots(tableId);
  const { player: myPlayer, loading: myPlayerLoading } = useMyPlayer(tableId, user?.uid ?? null);
  const [preparedRaise, setPreparedRaise] = useState(0);
  const [wasMyTurn, setWasMyTurn] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const online = useOnlineStatus();
  const wasOnlineRef = useRef(online);
  const { persistSession } = useLocalSession();
  const { toasts, pushToast, dismissToast } = useToasts();
  const router = useRouter();

  const potTotal = useMemo(() => {
    const potsTotal = pots.reduce((total, pot) => total + pot.amount, 0);
    return potsTotal > 0 ? potsTotal : table?.potTotal ?? 0;
  }, [pots, table?.potTotal]);

  const amountToCall = Math.max(0, (table?.highestBet ?? 0) - (myPlayer?.currentBet ?? 0));
  const currentTurnPlayer = players.find((player) => player.seatNumber === table?.currentTurnSeat);
  const isMyTurn = Boolean(myPlayer?.seatNumber !== null && myPlayer?.seatNumber === table?.currentTurnSeat);

  const statusText = useMemo(() => {
    if (table?.status === "finished") return "Mesa finalizada";
    if (!myPlayer) return "Uniéndote a la mesa...";
    if (myPlayer.status === "allIn") return "Estás all-in";
    if (myPlayer.status === "folded") return "Te retiraste";
    if (myPlayer.status === "broke") return "Te quedaste sin fichas";
    if (myPlayer.status === "waitingNextHand") return "Esperando la próxima mano";
    if (!myPlayer.connected) return "Reconectando...";
    if (isMyTurn) return "Tu turno";
    if (currentTurnPlayer) return `Esperando a ${currentTurnPlayer.name}`;
    return table?.status === "waiting" ? "Esperando la próxima mano" : "Esperando actualización de la mesa";
  }, [currentTurnPlayer, isMyTurn, myPlayer, table?.status]);

  const chipDisabled = !isMyTurn || !myPlayer || table?.status === "finished" || ["folded", "allIn", "broke", "waitingNextHand"].includes(myPlayer.status);

  useEffect(() => {
    if (!user || !myPlayer) return;
    persistSession({
      tableId,
      playerId: user.uid,
      name: myPlayer.name,
      seatNumber: myPlayer.seatNumber,
      isLeader: myPlayer.isLeader,
    });
  }, [myPlayer, persistSession, tableId, user]);

  useEffect(() => {
    if (!user) return;
    void updatePlayerConnection(tableId, user.uid, online);
  }, [online, tableId, user]);

  useEffect(() => {
    if (!isMyTurn || wasMyTurn) {
      setWasMyTurn(isMyTurn);
      return;
    }
    pushToast("Tu turno", "success");
    navigator.vibrate?.(35);
    setWasMyTurn(true);
  }, [isMyTurn, pushToast, wasMyTurn]);

  useEffect(() => {
    if (!myPlayer || lastStatus === myPlayer.status) return;
    if (myPlayer.status === "waitingNextHand") pushToast("Esperando la próxima mano", "warning");
    if (myPlayer.status === "allIn") pushToast("Estás all-in", "success");
    if (myPlayer.status === "folded") pushToast("Te retiraste", "warning");
    if (myPlayer.status === "broke") pushToast("Te quedaste sin fichas", "error");
    setLastStatus(myPlayer.status);
  }, [lastStatus, myPlayer, pushToast]);

  useEffect(() => {
    if (wasOnlineRef.current === online) return;
    wasOnlineRef.current = online;
    pushToast(online ? "Reconectado" : "Conexión perdida", online ? "success" : "error");
  }, [online, pushToast]);

  if (authLoading || tableLoading || playersLoading || myPlayerLoading) {
    return <main className="loading-state">Cargando tu mesa...</main>;
  }

  if (authError || !table || !user) {
    return <FirebaseErrorState title="No se pudo cargar la mesa" message={authError?.message ?? tableError?.message ?? "Revisá la configuración de Firebase o la conexión."} />;
  }

  if (table.status === "finished") {
    return <PostGameView table={table} />;
  }

  const leaveTable = async () => {
    if (!user) return;
    try {
      await updatePlayerConnection(tableId, user.uid, false);
    } catch {
      // ignore network failures when leaving the table
    }
    clearLocalSession();
    router.push("/");
  };

  return (
    <main className={`player-page ${isMyTurn ? "my-turn" : ""}`}>
      <ConnectionBanner online={online} snapshotError={tableError} />
      <PlayerGameView
        tableId={tableId}
        uid={user.uid}
        table={table}
        players={players}
        myPlayer={myPlayer}
        pots={pots}
        preparedRaise={preparedRaise}
        statusText={statusText}
        potTotal={potTotal}
        amountToCall={amountToCall}
        isMyTurn={isMyTurn}
        chipDisabled={chipDisabled}
        onAddChip={(value) => setPreparedRaise((amount) => amount + value)}
        onClearPreparedRaise={() => setPreparedRaise(0)}
        onToast={pushToast}
        onLeaveTable={leaveTable}
      />
      <DebugPanel table={table} players={players} pots={pots} snapshotLabel="player" />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
