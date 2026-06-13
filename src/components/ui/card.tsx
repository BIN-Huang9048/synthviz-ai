"use client";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> { padding?: "none" | "sm" | "md" | "lg" }
const pMap = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

export function Card({ className, padding = "md", children, ...props }: CardProps) {
  return <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900", pMap[padding], className)} {...props}>{children}</div>;
}
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-center justify-between", className)} {...props}>{children}</div>;
}
export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100", className)} {...props}>{children}</h3>;
}
export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-gray-500 dark:text-gray-400", className)} {...props}>{children}</p>;
}
export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props}>{children}</div>;
}
export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex items-center border-t border-gray-100 pt-4 dark:border-gray-800", className)} {...props}>{children}</div>;
}
