type FirebaseErrorStateProps = {
  title?: string;
  message?: string;
};

export function FirebaseErrorState({ title = "Firebase connection failed", message }: FirebaseErrorStateProps) {
  return (
    <main className="loading-state">
      <section className="error-card friendly-error">
        <strong>{title}</strong>
        <p>{message ?? "Check Firebase environment variables, Auth, Firestore rules, and your network connection."}</p>
      </section>
    </main>
  );
}
