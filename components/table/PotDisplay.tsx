type PotDisplayProps = {
  amount: number;
};

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <div className="pot-display">
      <span>Total pot</span>
      <strong>${amount}</strong>
    </div>
  );
}
