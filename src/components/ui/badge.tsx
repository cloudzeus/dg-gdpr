import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

/* Microsoft Fluent status badge colors */
const variants = {
  default:   "bg-[rgba(0,120,212,0.1)] text-[rgb(0,90,158)] border-[rgba(0,120,212,0.3)]",
  secondary: "bg-[rgba(50,49,48,0.07)] text-[#323130] border-[rgba(50,49,48,0.2)]",
  destructive: "bg-[rgba(164,38,44,0.08)] text-[#a4262c] border-[rgba(164,38,44,0.3)]",
  outline:   "border-[rgb(0,120,212)] text-[rgb(0,120,212)] bg-transparent",
  success:   "bg-[rgba(16,124,16,0.08)] text-[#107c10] border-[rgba(16,124,16,0.3)]",
  warning:   "bg-[rgba(202,93,0,0.1)] text-[#ca5d00] border-[rgba(202,93,0,0.3)]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
