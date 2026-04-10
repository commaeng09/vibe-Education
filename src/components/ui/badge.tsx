import { clsx } from "clsx";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-secondary text-foreground": variant === "default",
          "bg-emerald-100 text-emerald-700": variant === "success",
          "bg-amber-100 text-amber-700": variant === "warning",
          "bg-red-100 text-red-700": variant === "danger",
          "bg-cyan-100 text-cyan-700": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "easy" ? "success" : difficulty === "medium" ? "warning" : "danger";
  const label = difficulty === "easy" ? "쉬움" : difficulty === "medium" ? "보통" : "어려움";
  return <Badge variant={variant}>{label}</Badge>;
}
