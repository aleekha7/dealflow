export type FirmTier =
  | "Bulge Bracket"
  | "Elite Boutique"
  | "Middle Market"
  | "Boutique"
  | "Other";

export type PipelineStage =
  | "Not Contacted"
  | "Emailed"
  | "Followed Up"
  | "Replied"
  | "Coffee Chat Scheduled"
  | "Coffee Chat Done"
  | "Closed (Positive)"
  | "Closed (No Response)";

export type TemplateCategory =
  | "Cold Outreach"
  | "Follow-Up"
  | "Thank You"
  | "Coffee Chat Request";

export type ActionType =
  | "Emailed"
  | "Followed Up"
  | "Replied"
  | "Coffee Chat"
  | "Note Added";

export type SubscriptionStatus = "trial" | "active" | "canceled" | "past_due";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  school: string;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  firm: string;
  role: string;
  email: string;
  linkedin_url: string;
  tier: FirmTier;
  notes: string;
  pipeline_stage: PipelineStage;
  reminder_date: string | null;
  last_action_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  created_at: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
}

export interface OutreachLogEntry {
  id: string;
  user_id: string;
  contact_id: string;
  created_at: string;
  action_type: ActionType;
  note: string;
}
