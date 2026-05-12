"use client";

type SeatSelectorProps = {
  maxPlayers: number;
  occupiedSeats: number[];
  selectedSeat: number | null;
  onSelect: (seat: number) => void;
};

export function SeatSelector({ maxPlayers, occupiedSeats, selectedSeat, onSelect }: SeatSelectorProps) {
  const seats = Array.from({ length: maxPlayers }, (_, index) => index + 1);

  return (
    <section className="field">
      <label>Choose your seat</label>
      <div className="seat-grid">
        {seats.map((seat) => {
          const occupied = occupiedSeats.includes(seat);
          return (
            <button
              key={seat}
              type="button"
              className={`seat-choice ${selectedSeat === seat ? "selected" : ""}`}
              disabled={occupied}
              onClick={() => onSelect(seat)}
            >
              {occupied ? "Taken" : `Seat ${seat}`}
            </button>
          );
        })}
      </div>
    </section>
  );
}
