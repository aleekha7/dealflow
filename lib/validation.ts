import { z } from "zod";
import {
  ACTION_TYPES,
  STAGES,
  TEMPLATE_CATEGORIES,
  TIERS,
} from "@/lib/constants";

const tierEnum = z.enum(TIERS as [string, ...string[]]);
const stageEnum = z.enum(STAGES as [string, ...string[]]);
const categoryEnum = z.enum(TEMPLATE_CATEGORIES as [string, ...string[]]);
const actionEnum = z.enum(ACTION_TYPES as [string, ...string[]]);

const emptyOrUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), {
    message: "Must be a valid URL starting with http(s)://",
  });

const emptyOrEmail = z
  .string()
  .trim()
  .max(320)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Must be a valid email address",
  });

export const contactSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).default(""),
  firm: z.string().trim().max(200).default(""),
  role: z.string().trim().max(200).default(""),
  email: emptyOrEmail.default(""),
  linkedin_url: emptyOrUrl.default(""),
  tier: tierEnum.default("Other"),
  notes: z.string().max(10000).default(""),
  pipeline_stage: stageEnum.default("Not Contacted"),
  reminder_date: z.string().datetime({ offset: true }).nullable().optional(),
});

export const contactUpdateSchema = contactSchema.partial();

export const csvImportSchema = z.object({
  contacts: z.array(contactSchema).min(1).max(1000),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  category: categoryEnum,
  subject: z.string().max(500).default(""),
  body: z.string().max(20000).default(""),
});

export const logEntrySchema = z.object({
  contact_id: z.string().uuid(),
  action_type: actionEnum,
  note: z.string().max(5000).default(""),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().max(200),
  school: z.string().trim().max(200),
});
