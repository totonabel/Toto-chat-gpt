"use client";

import { PokerChip } from "./PokerChip";

const defaultValues = [10, 25, 50, 100, 250, 500, 1000];

type ChipSelectorProps = {
  values?: number[];
  onAdd: (value: number) => void;
  disabled?: boolean;
};

export function ChipSelector({ values = defaultValues, onAdd, disabled = false }: ChipSelectorProps) {
  return (
    <section className="chip-panel" aria-label="Raise chips">
      <div className="chip-row">
        {values.map((value) => (
          <PokerChip key={value} value={value} onClick={onAdd} disabled={disabled} />
        ))}
      </div>
    </section>
  );
}
