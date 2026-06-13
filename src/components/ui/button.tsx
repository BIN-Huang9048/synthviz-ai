"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-violet-600 text-white hover:bg-violet-700 shadow-sm",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  outline: "border border-gray-300 bg-transparent hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800",
  ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-base rounded-lg",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: keyof typeof variants; size?: keyof typeof sizes; isLoading?: boolean }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
    <button ref={ref} disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 transition-opacity duration-200",
        variants[variant], sizes[size], className
      )}
      {...props}>
      {isLoading && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  )
);
Button.displayName = "Button";
export { Button, type ButtonProps };
export default Button;
