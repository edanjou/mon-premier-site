import { Crown, UserRound } from "lucide-react";

export default function KingIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <UserRound size={size} />
      <Crown
        size={Math.round(size * 0.55)}
        className="absolute -top-1 left-1/2 -translate-x-1/2"
      />
    </span>
  );
}
