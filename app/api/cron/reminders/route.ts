import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getFromAddress, getResend } from "@/lib/resend";
import { fullName } from "@/lib/utils";
import type { Contact } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DueContact
  extends Pick<
    Contact,
    "id" | "first_name" | "last_name" | "firm" | "pipeline_stage" | "reminder_date" | "user_id"
  > {}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function digestHtml(name: string, contacts: DueContact[], appUrl: string) {
  const rows = contacts
    .map(
      (c) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-weight:600;">${escapeHtml(fullName(c))}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;">${escapeHtml(c.firm || "—")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;">${escapeHtml(c.pipeline_stage)}</td>
        </tr>`
    )
    .join("");

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 4px;">Your follow-ups for today</h2>
    <p style="margin:0 0 20px;color:#52525b;">
      ${name ? `Hi ${escapeHtml(name)}, you` : "You"} have ${contacts.length} contact${contacts.length === 1 ? "" : "s"} due for a follow-up.
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;">
      <thead>
        <tr style="background:#fafafa;text-align:left;">
          <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Contact</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Firm</th>
          <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Stage</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <a href="${appUrl}/dashboard"
       style="display:inline-block;margin-top:20px;padding:10px 18px;background:#18181b;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;">
      Open DealFlow
    </a>
    <p style="margin-top:24px;font-size:12px;color:#a1a1aa;">
      You're receiving this because you set follow-up reminders in DealFlow.
    </p>
  </div>`;
}

/**
 * GET /api/cron/reminders — daily digest email (triggered by Vercel Cron,
 * see vercel.json). Authenticated with CRON_SECRET, not a user session.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // All contacts with a reminder due today or earlier
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const { data: contacts, error: contactsError } = await admin
    .from("contacts")
    .select("id, user_id, first_name, last_name, firm, pipeline_stage, reminder_date")
    .not("reminder_date", "is", null)
    .lte("reminder_date", endOfToday.toISOString());

  if (contactsError) {
    console.error("Cron query failed:", contactsError);
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders due" });
  }

  // Group by user
  const byUser = new Map<string, DueContact[]>();
  for (const c of contacts as DueContact[]) {
    const list = byUser.get(c.user_id) ?? [];
    list.push(c);
    byUser.set(c.user_id, list);
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", Array.from(byUser.keys()));

  if (profilesError) {
    console.error("Cron profile query failed:", profilesError);
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const resend = getResend();
  const from = getFromAddress();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let sent = 0;
  const failures: string[] = [];

  for (const profile of profiles ?? []) {
    const due = byUser.get(profile.id);
    if (!due || due.length === 0) continue;

    const firstName = (profile.full_name ?? "").split(" ")[0] ?? "";
    try {
      const { error: sendError } = await resend.emails.send({
        from,
        to: profile.email,
        subject: `DealFlow: ${due.length} follow-up${due.length === 1 ? "" : "s"} due today`,
        html: digestHtml(firstName, due, appUrl),
      });
      if (sendError) {
        failures.push(`${profile.email}: ${sendError.message}`);
      } else {
        sent++;
      }
    } catch (e) {
      failures.push(`${profile.email}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  if (failures.length > 0) {
    console.error("Reminder digest failures:", failures);
  }

  return NextResponse.json({ sent, failed: failures.length });
}
