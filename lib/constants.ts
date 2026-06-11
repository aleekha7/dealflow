import type {
  ActionType,
  FirmTier,
  PipelineStage,
  TemplateCategory,
} from "@/types";

export const TIERS: FirmTier[] = [
  "Bulge Bracket",
  "Elite Boutique",
  "Middle Market",
  "Boutique",
  "Other",
];

export const STAGES: PipelineStage[] = [
  "Not Contacted",
  "Emailed",
  "Followed Up",
  "Replied",
  "Coffee Chat Scheduled",
  "Coffee Chat Done",
  "Closed (Positive)",
  "Closed (No Response)",
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Cold Outreach",
  "Follow-Up",
  "Thank You",
  "Coffee Chat Request",
];

export const ACTION_TYPES: ActionType[] = [
  "Emailed",
  "Followed Up",
  "Replied",
  "Coffee Chat",
  "Note Added",
];

/** Color-coded badge classes per firm tier (light + dark mode). */
export const TIER_BADGE_CLASSES: Record<FirmTier, string> = {
  "Bulge Bracket":
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  "Elite Boutique":
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900",
  "Middle Market":
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  Boutique:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  Other:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

/** Hex colors per tier for charts. */
export const TIER_CHART_COLORS: Record<FirmTier, string> = {
  "Bulge Bracket": "#3b82f6",
  "Elite Boutique": "#a855f7",
  "Middle Market": "#22c55e",
  Boutique: "#eab308",
  Other: "#6b7280",
};

/**
 * When a contact is dragged to one of these stages, an outreach log entry is
 * recorded automatically (the log drives "days since last action").
 */
export const STAGE_TO_ACTION: Partial<Record<PipelineStage, ActionType>> = {
  Emailed: "Emailed",
  "Followed Up": "Followed Up",
  Replied: "Replied",
  "Coffee Chat Scheduled": "Coffee Chat",
  "Coffee Chat Done": "Coffee Chat",
};

export const STAGE_NOTES: Partial<Record<PipelineStage, string>> = {
  "Coffee Chat Scheduled": "Coffee chat scheduled",
  "Coffee Chat Done": "Coffee chat completed",
};

export const PLAN_NAME = "DealFlow Pro";
export const PLAN_PRICE = "$15/month";
export const TRIAL_DAYS = 7;
