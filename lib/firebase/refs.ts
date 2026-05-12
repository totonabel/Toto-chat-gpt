import { collection, doc } from "firebase/firestore";
import { getFirebaseDb } from "./config";

export const tablesRef = () => collection(getFirebaseDb(), "tables");
export const tableRef = (tableId: string) => doc(getFirebaseDb(), "tables", tableId);
export const playersRef = (tableId: string) => collection(tableRef(tableId), "players");
export const playerRef = (tableId: string, playerId: string) => doc(playersRef(tableId), playerId);
export const actionsRef = (tableId: string) => collection(tableRef(tableId), "actions");
export const actionRef = (tableId: string, actionId: string) => doc(actionsRef(tableId), actionId);
export const potsRef = (tableId: string) => collection(tableRef(tableId), "pots");
export const potRef = (tableId: string, potId: string) => doc(potsRef(tableId), potId);
