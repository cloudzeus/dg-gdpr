"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-sm px-3 text-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-1",
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
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
