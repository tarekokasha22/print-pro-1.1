import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function getFileType(filename: string): string {
  const ext = getFileExtension(filename);
  const types: Record<string, string> = {
    pdf: "pdf",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
    bmp: "image",
    doc: "docx",
    docx: "docx",
    ppt: "pptx",
    pptx: "pptx",
    xls: "xlsx",
    xlsx: "xlsx",
  };
  return types[ext] || "other";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const FILE_ICONS: Record<string, string> = {
  pdf: "📄",
  image: "🖼️",
  docx: "📝",
  pptx: "📊",
  xlsx: "📋",
  other: "📁",
};

export const FILE_COLORS: Record<string, string> = {
  pdf: "text-red-400",
  image: "text-green-400",
  docx: "text-blue-400",
  pptx: "text-orange-400",
  xlsx: "text-emerald-400",
  other: "text-gray-400",
};
