import { cn } from "@/lib/utils";

export function CommandBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CommandBarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "default",
  type = "button",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "primary" &&
          "text-primary hover:bg-primary/10",
        variant === "danger" &&
          "text-destructive hover:bg-destructive/10",
        variant === "default" &&
          "text-foreground hover:bg-secondary"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function CommandBarSeparator() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
