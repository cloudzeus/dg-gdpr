import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

/* Microsoft Fluent button styles */
const variants = {
  default:
    "bg-[rgb(0,120,212)] text-white hover:bg-[rgb(16,110,190)] active:bg-[rgb(0,90,158)] shadow-none",
  destructive:
    "bg-[rgb(164,38,44)] text-white hover:bg-[rgb(138,28,33)] active:bg-[rgb(105,16,19)] shadow-none",
  outline:
    "border border-[#8a8886] bg-white text-[#201f1e] hover:bg-[#f3f2f1] active:bg-[#edebe9]",
  secondary:
    "bg-[#f3f2f1] text-[#323130] border border-[#edebe9] hover:bg-[#edebe9] active:bg-[#e1dfdd]",
  ghost:
    "text-[#323130] hover:bg-[#f3f2f1] active:bg-[#edebe9]",
  link:
    "text-[rgb(0,120,212)] underline-offset-4 hover:underline p-0 h-auto",
};

const sizes = {
  default: "h-8 px-4 text-sm",
  sm: "h-7 px-3 text-xs",
  lg: "h-10 px-6 text-[15px]",
  icon: "h-8 w-8",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-semibold transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(0,120,212)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
