type FirebaseErrorStateProps = {
  title?: string;
  message?: string;
};

export function FirebaseErrorState({ title = "Falló la conexión con Firebase", message }: FirebaseErrorStateProps) {
  return (
    <main className="loading-state">
      <section className="error-card friendly-error">
        <strong>{title}</strong>
        <p>{message ?? "Revisá las variables de entorno de Firebase, Auth, las reglas de Firestore y tu conexión de red."}</p>
      </section>
    </main>
  );
}
