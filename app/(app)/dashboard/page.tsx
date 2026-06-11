import type { Metadata } from "next";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Coffee,
  Mail,
  Reply,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { TierDonut } from "@/components/dashboard/tier-donut";
import { TierBadge } from "@/components/tier-badge";
import { STAGES, TIERS, TIER_CHART_COLORS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/utils";
import type { Contact, OutreachLogEntry } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: contactsData }, { data: logData }] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, firm, tier, pipeline_stage, reminder_date, created_at, last_action_at"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("outreach_log")
      .select("contact_id, action_type, created_at")
      .in("action_type", ["Emailed", "Replied"]),
  ]);

  const contacts = (contactsData ?? []) as Contact[];
  const log = (logData ?? []) as Pick<
    OutreachLogEntry,
    "contact_id" | "action_type" | "created_at"
  >[];

  // ---- Stats ----
  const weekAgo = subDays(new Date(), 7);
  const emailedAll = new Set(
    log.filter((l) => l.action_type === "Emailed").map((l) => l.contact_id)
  );
  const repliedAll = new Set(
    log.filter((l) => l.action_type === "Replied").map((l) => l.contact_id)
  );
  const emailedThisWeek = new Set(
    log
      .filter(
        (l) =>
          l.action_type === "Emailed" && new Date(l.created_at) >= weekAgo
      )
      .map((l) => l.contact_id)
  );
  const replyRate =
    emailedAll.size > 0
      ? Math.round((repliedAll.size / emailedAll.size) * 100)
      : null;
  const chatsScheduled = contacts.filter(
    (c) => c.pipeline_stage === "Coffee Chat Scheduled"
  ).length;
  const chatsDone = contacts.filter(
    (c) =>
      c.pipeline_stage === "Coffee Chat Done" ||
      c.pipeline_stage === "Closed (Positive)"
  ).length;

  // ---- Reminders ----
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const withReminder = contacts.filter((c) => c.reminder_date);
  const overdue = withReminder.filter(
    (c) => new Date(c.reminder_date!) < startOfToday
  );
  const dueToday = withReminder.filter((c) => {
    const d = new Date(c.reminder_date!);
    return d >= startOfToday && d <= endOfToday;
  });

  // ---- Charts ----
  const funnelData = STAGES.map((stage) => ({
    stage,
    count: contacts.filter((c) => c.pipeline_stage === stage).length,
  }));
  const tierData = TIERS.map((tier) => ({
    name: tier,
    value: contacts.filter((c) => c.tier === tier).length,
    color: TIER_CHART_COLORS[tier],
  })).filter((d) => d.value > 0);

  const recent = contacts.slice(0, 5);

  const stats = [
    { label: "Total contacts", value: contacts.length, icon: Users },
    { label: "Emailed this week", value: emailedThisWeek.size, icon: Mail },
    {
      label: "Reply rate",
      value: replyRate === null ? "—" : `${replyRate}%`,
      icon: Reply,
    },
    { label: "Coffee chats scheduled", value: chatsScheduled, icon: Coffee },
    { label: "Coffee chats completed", value: chatsDone, icon: Coffee },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your networking pipeline at a glance.
        </p>
      </div>

      {/* Reminders due */}
      {(overdue.length > 0 || dueToday.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {overdue.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue ({overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReminderList contacts={overdue} />
              </CardContent>
            </Card>
          )}
          {dueToday.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  Due today ({dueToday.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReminderList contacts={dueToday} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium">
                {stat.label}
              </CardDescription>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline funnel</CardTitle>
            <CardDescription>Contacts at each outreach stage</CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <ChartEmpty />
            ) : (
              <FunnelChart data={funnelData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firm tier breakdown</CardTitle>
            <CardDescription>Where your network is focused</CardDescription>
          </CardHeader>
          <CardContent>
            {tierData.length === 0 ? (
              <ChartEmpty />
            ) : (
              <TierDonut data={tierData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently added */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recently added</CardTitle>
            <CardDescription>Your 5 newest contacts</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/contacts">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No contacts yet — add your first contact to get started.
              </p>
              <Button size="sm" asChild>
                <Link href="/contacts">Add a contact</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {recent.map((contact) => (
                <li
                  key={contact.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {fullName(contact)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.firm || "No firm"} ·{" "}
                      {format(new Date(contact.created_at), "MMM d")}
                    </p>
                  </div>
                  <TierBadge tier={contact.tier} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReminderList({ contacts }: { contacts: Contact[] }) {
  return (
    <ul className="space-y-2">
      {contacts.slice(0, 6).map((contact) => (
        <li key={contact.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{fullName(contact)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {contact.firm || "No firm"} · {contact.pipeline_stage}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/pipeline">Follow up</Link>
          </Button>
        </li>
      ))}
      {contacts.length > 6 ? (
        <li className="pt-1 text-xs text-muted-foreground">
          +{contacts.length - 6} more on the pipeline board
        </li>
      ) : null}
    </ul>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      Add contacts to see this chart.
    </div>
  );
}
