declare const process: {
  env: Record<string, string | undefined>;
};

declare module "*.css" {}

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: unknown;
  }
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}

declare module "react" {
  export type CSSProperties = Record<string, string | number | undefined>;
  export type FormEvent<T = unknown> = { preventDefault: () => void; currentTarget: T };
  export type ReactNode = unknown;
  export type SetStateAction<T> = T | ((previous: T) => T);
  export const useCallback: <T extends (...args: never[]) => unknown>(callback: T, deps: unknown[]) => T;
  export const useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  export const useMemo: <T>(factory: () => T, deps: unknown[]) => T;
  export const useState: <T>(initial: T | (() => T)) => [T, (value: SetStateAction<T>) => void];
}

declare module "react/jsx-runtime" {
  export const jsx: (...args: unknown[]) => unknown;
  export const jsxs: (...args: unknown[]) => unknown;
  export const Fragment: unknown;
}

declare module "next" {
  export type Metadata = Record<string, unknown>;
  export type NextConfig = Record<string, unknown>;
}

declare module "next/link" {
  const Link: (props: Record<string, unknown>) => unknown;
  export default Link;
}

declare module "next/navigation" {
  export const useRouter: () => { push: (href: string) => void; replace: (href: string) => void };
  export const useParams: <T extends Record<string, string>>() => T;
}

declare module "firebase/app" {
  export type FirebaseApp = unknown;
  export const getApps: () => FirebaseApp[];
  export const initializeApp: (config: Record<string, string | undefined>) => FirebaseApp;
}

declare module "firebase/auth" {
  export type Auth = { currentUser: User | null };
  export type User = { uid: string };
  export const getAuth: (app?: unknown) => Auth;
  export const signInAnonymously: (auth: Auth) => Promise<{ user: User }>;
  export const onAuthStateChanged: (auth: Auth, onChange: (user: User | null) => void) => () => void;
}

declare module "firebase/firestore" {
  export type Firestore = unknown;
  export type DocumentReference = { id: string };
  export type CollectionReference = { id: string };
  export type QuerySnapshot = { docs: Array<{ id: string; data: () => unknown }> };
  export type DocumentSnapshot = { id: string; exists: () => boolean; data: () => unknown };
  export type Transaction = {
    get: (ref: DocumentReference) => Promise<DocumentSnapshot>;
    set: (ref: DocumentReference, data: unknown, options?: unknown) => void;
    update: (ref: DocumentReference, data: Record<string, unknown>) => void;
    delete: (ref: DocumentReference) => void;
  };
  export const getFirestore: (app?: unknown) => Firestore;
  export const collection: (...args: unknown[]) => CollectionReference;
  export const doc: (...args: unknown[]) => DocumentReference;
  export const addDoc: (ref: CollectionReference, data: unknown) => Promise<{ id: string }>;
  export const setDoc: (ref: DocumentReference, data: unknown, options?: unknown) => Promise<void>;
  export const updateDoc: (ref: DocumentReference, data: Record<string, unknown>) => Promise<void>;
  export const getDocs: (query: unknown) => Promise<QuerySnapshot>;
  export const query: (...args: unknown[]) => unknown;
  export const where: (...args: unknown[]) => unknown;
  export const limit: (count: number) => unknown;
  export const orderBy: (field: string, direction?: string) => unknown;
  export const onSnapshot: (ref: unknown, next: (snapshot: DocumentSnapshot & QuerySnapshot) => void, error?: (error: Error) => void) => () => void;
  export const serverTimestamp: () => unknown;
  export const runTransaction: <T>(db: Firestore, updateFunction: (transaction: Transaction) => Promise<T>) => Promise<T>;
  export const writeBatch: (db: Firestore) => { set: (ref: DocumentReference, data: unknown) => void; commit: () => Promise<void> };
}
