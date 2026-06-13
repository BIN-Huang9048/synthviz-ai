/**
 * 通用工具函数
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名，智能去重
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  return new Date(date).toLocaleDateString("zh-CN", options);
}

/** 字符串哈希 → HSL 颜色（用于图表着色） */
export function hashColor(key: string): string {
  let h = 0; for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360}, 65%, 55%)`;
}
