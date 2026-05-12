import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { getFirebaseAuth } from "./config";

export const signInAnonymous = async (): Promise<User> => {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
};

export const subscribeToAuth = (onChange: (user: User | null) => void): (() => void) =>
  onAuthStateChanged(getFirebaseAuth(), onChange);
