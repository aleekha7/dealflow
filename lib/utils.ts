import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(c: { first_name: string; last_name: string }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ");
}

export function daysSince(dateIso: string): number {
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(dateIso)));
}

export function daysSinceLabel(dateIso: string): string {
  const d = daysSince(dateIso);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

/** True if a reminder is due today (or earlier). */
export function isDue(reminderIso: string | null): boolean {
  if (!reminderIso) return false;
  return differenceInCalendarDays(new Date(reminderIso), new Date()) <= 0;
}

/** True if a reminder is strictly in the past (before today). */
export function isOverdue(reminderIso: string | null): boolean {
  if (!reminderIso) return false;
  return differenceInCalendarDays(new Date(reminderIso), new Date()) < 0;
}

export function trialDaysLeft(trialEndsAt: string): number {
  return Math.max(
    0,
    differenceInCalendarDays(new Date(trialEndsAt), new Date())
  );
}
