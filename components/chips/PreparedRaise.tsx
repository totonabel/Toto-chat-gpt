"use client";

type PreparedRaiseProps = {
  amount: number;
  onClear: () => void;
};

export function PreparedRaise({ amount, onClear }: PreparedRaiseProps) {
  return (
    <div className="prepared-raise" aria-live="polite">
      <div>
        <span className="muted">Suba preparada</span>
        <strong>${amount}</strong>
      </div>
      <button type="button" className="secondary-button" onClick={onClear} disabled={amount === 0}>
        Limpiar
      </button>
    </div>
  );
}
