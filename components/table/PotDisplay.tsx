type PotDisplayProps = {
  amount: number;
};

export function PotDisplay({ amount }: PotDisplayProps) {
  return (
    <div className="pot-display">
      <span>Pozo total</span>
      <strong>${amount}</strong>
    </div>
  );
}
