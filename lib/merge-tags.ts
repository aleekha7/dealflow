import type { Contact, Profile } from "@/types";

export const MERGE_TAGS = [
  "{{first_name}}",
  "{{firm}}",
  "{{role}}",
  "{{your_name}}",
  "{{your_school}}",
] as const;

export interface MergeContext {
  first_name: string;
  firm: string;
  role: string;
  your_name: string;
  your_school: string;
}

export function contextFromContact(
  contact: Pick<Contact, "first_name" | "firm" | "role"> | null,
  profile: Pick<Profile, "full_name" | "school"> | null
): MergeContext {
  return {
    first_name: contact?.first_name || "there",
    firm: contact?.firm || "your firm",
    role: contact?.role || "professional",
    your_name: profile?.full_name || "[Your Name]",
    your_school: profile?.school || "[Your School]",
  };
}

export function fillTemplate(text: string, ctx: MergeContext): string {
  return text
    .replace(/\{\{\s*first_name\s*\}\}/g, ctx.first_name)
    .replace(/\{\{\s*firm\s*\}\}/g, ctx.firm)
    .replace(/\{\{\s*role\s*\}\}/g, ctx.role)
    .replace(/\{\{\s*your_name\s*\}\}/g, ctx.your_name)
    .replace(/\{\{\s*your_school\s*\}\}/g, ctx.your_school);
}
