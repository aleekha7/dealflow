import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireUser } from "@/lib/api";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const bodySchema = z.object({
  contact: z.object({
    first_name: z.string(),
    last_name: z.string(),
    firm: z.string(),
    role: z.string(),
    tier: z.string().optional(),
    notes: z.string().optional(),
  }),
  profile: z.object({
    full_name: z.string(),
    school: z.string(),
  }),
  tone: z.enum(["professional", "conversational", "concise"]).default("professional"),
  extraContext: z.string().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireUser();
  if (error) return error;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const { contact, profile, tone, extraContext } = body;

  const toneGuide =
    tone === "conversational"
      ? "warm, genuine, and a little personal — avoid sounding like a form letter"
      : tone === "concise"
      ? "direct and brief — under 120 words in the body, no fluff"
      : "polished and professional but still human";

  const prompt = `You are helping a finance student named ${profile.full_name} from ${profile.school} write a cold outreach email to a finance professional.

Contact details:
- Name: ${contact.first_name} ${contact.last_name}
- Firm: ${contact.firm}
- Role: ${contact.role}${contact.tier ? `\n- Firm tier: ${contact.tier}` : ""}${contact.notes ? `\n- Notes: ${contact.notes}` : ""}${extraContext ? `\n- Extra context: ${extraContext}` : ""}

Tone: ${toneGuide}

Write a cold outreach email from ${profile.full_name} (${profile.school}) to ${contact.first_name} at ${contact.firm}.

Rules:
- Specific, compelling subject line (not generic like "Networking Request")
- Concise and respectful of their time
- Mention genuine interest in ${contact.firm} or the contact's work
- Clear low-friction ask (e.g. a 20-minute call)
- Professional sign-off from ${profile.full_name}

Respond with ONLY a JSON object, no markdown, no explanation:
{"subject": "...", "body": "..."}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let parsed: { subject: string; body: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
      if (!match) return jsonError("Could not parse AI response", 500);
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json({ subject: parsed.subject, body: parsed.body });
  } catch (err) {
    console.error("AI generate error:", err);
    return jsonError("AI generation failed", 500);
  }
}
