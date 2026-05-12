"use client";

import { PokerChip } from "./PokerChip";

const defaultValues = [250, 500, 1000, 2000];

type ChipSelectorProps = {
  values?: number[];
  onAdd: (value: number) => void;
  disabled?: boolean;
};

export function ChipSelector({ values = defaultValues, onAdd, disabled = false }: ChipSelectorProps) {
  return (
    <section className="chip-panel" aria-label="Fichas para subir">
      <div className="chip-row">
        {values.map((value) => (
          <PokerChip key={value} value={value} onClick={onAdd} disabled={disabled} />
        ))}
      </div>
    </section>
  );
}
