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

  const { contact, profile } = body;

  const prompt = `You are helping ${profile.full_name}, a finance student from ${profile.school}, prepare for a coffee chat with ${contact.first_name} ${contact.last_name}, who is a ${contact.role} at ${contact.firm}${contact.tier ? ` (${contact.tier})` : ""}.${contact.notes ? `\n\nNotes about this person: ${contact.notes}` : ""}

Generate a concise coffee chat prep sheet. Respond with ONLY a JSON object in this exact format (no markdown, no explanation):

{
  "firmBackground": "2-3 sentences about ${contact.firm}: what they're known for, their positioning in the market, and anything notable",
  "questionsTheyMightAsk": [
    "Question they might ask you",
    "Question they might ask you",
    "Question they might ask you",
    "Question they might ask you"
  ],
  "questionsToAskThem": [
    "Thoughtful question to ask ${contact.first_name}",
    "Thoughtful question to ask ${contact.first_name}",
    "Thoughtful question to ask ${contact.first_name}",
    "Thoughtful question to ask ${contact.first_name}"
  ],
  "talkingPoints": [
    "Brief talking point or thing to mention",
    "Brief talking point or thing to mention",
    "Brief talking point or thing to mention"
  ]
}

Make the questions to ask specific to their role as ${contact.role} at ${contact.firm}. Keep everything concise and actionable.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let parsed: {
      firmBackground: string;
      questionsTheyMightAsk: string[];
      questionsToAskThem: string[];
      talkingPoints: string[];
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return jsonError("Could not parse AI response", 500);
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Prep sheet error:", err);
    return jsonError("AI generation failed", 500);
  }
}
