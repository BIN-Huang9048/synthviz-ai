"use client";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; hint?: string }

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="w-full">
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <input ref={ref} id={id}
        className={cn(
          "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
          "placeholder:text-gray-400",
          "focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          className
        )} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";
export { Input, type InputProps };
export default Input;
