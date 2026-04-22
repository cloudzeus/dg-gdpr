"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { MdKeyboardArrowDown } from "react-icons/md";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, style, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-8 w-full appearance-none rounded-sm px-3 pr-8 text-sm transition-colors",
          "focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          border: "1px solid #8a8886",
          background: "rgb(var(--card))",
          color: "rgb(var(--foreground))",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgb(0,120,212)";
          e.currentTarget.style.boxShadow = "0 0 0 1px rgb(0,120,212)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#8a8886";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
        {...props}
      >
        {children}
      </select>
      <MdKeyboardArrowDown
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
);
Select.displayName = "Select";
