"use client";

import type { CSSProperties } from "react";

type PokerChipProps = {
  value: number;
  onClick?: (value: number) => void;
  disabled?: boolean;
};

const chipColors: Record<number, string> = {
  10: "#2f80ed",
  25: "#27ae60",
  50: "#9b51e0",
  100: "#eb5757",
  250: "#f2994a",
  500: "#111827",
  1000: "#d4af37",
};

export function PokerChip({ value, onClick, disabled = false }: PokerChipProps) {
  return (
    <button
      type="button"
      className="poker-chip"
      style={{ "--chip-color": chipColors[value] ?? "#4b5563" } as CSSProperties}
      onClick={() => onClick?.(value)}
      disabled={disabled}
      aria-label={`Add ${value} to prepared raise`}
    >
      <span>{value}</span>
    </button>
  );
}
