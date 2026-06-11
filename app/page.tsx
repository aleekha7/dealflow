import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Kanban,
  Mail,
  TrendingUp,
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
import { ThemeToggle } from "@/components/theme-toggle";
import { PLAN_NAME } from "@/lib/constants";

const features = [
  {
    icon: Users,
    title: "Contact management",
    description:
      "Track every banker, associate, and partner you meet — organized by firm, tier, and role. Bulk import from CSV in seconds.",
  },
  {
    icon: Kanban,
    title: "Outreach pipeline",
    description:
      "A drag-and-drop kanban board that takes each contact from cold email to coffee chat to offer-season ally.",
  },
  {
    icon: Mail,
    title: "Email templates",
    description:
      "Battle-tested outreach templates with merge tags. Personalize a cold email in one click, not twenty minutes.",
  },
  {
    icon: Bell,
    title: "Follow-up reminders",
    description:
      "Never let a thread go cold. Daily digest emails and in-app alerts tell you exactly who to follow up with today.",
  },
  {
    icon: BarChart3,
    title: "Networking analytics",
    description:
      "Reply rates, pipeline funnels, and firm-tier breakdowns — know what's working and where to focus.",
  },
  {
    icon: TrendingUp,
    title: "Built for recruiting season",
    description:
      "Designed around the IB/PE/VC recruiting cycle by people who've been through it. No bloated enterprise CRM features.",
  },
];

const pricingPoints = [
  "Unlimited contacts & CSV import",
  "Drag-and-drop outreach pipeline",
  "Email template library with merge tags",
  "Daily follow-up reminder digest",
  "Reply-rate & pipeline analytics",
  "7-day free trial — no card required",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <TrendingUp className="h-5 w-5" />
            <span className="text-lg">DealFlow</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container flex flex-col items-center gap-6 py-24 text-center md:py-32">
          <div className="rounded-full border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Built for IB · PE · VC recruiting
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Turn cold emails into offers.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            DealFlow is the networking CRM for finance students. Track every
            contact, never miss a follow-up, and run your recruiting outreach
            like a deal process.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                Start your 7-day free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required. $15/month after trial.
          </p>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/40 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to network like a pro
              </h2>
              <p className="mt-3 text-muted-foreground">
                Stop tracking bankers in a spreadsheet. DealFlow keeps your
                entire recruiting pipeline organized and moving.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="h-8 w-8" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container py-24">
          <div className="mx-auto max-w-md">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardDescription className="text-sm font-semibold uppercase tracking-wide">
                  {PLAN_NAME}
                </CardDescription>
                <CardTitle className="text-5xl font-bold">
                  $15
                  <span className="text-lg font-normal text-muted-foreground">
                    /month
                  </span>
                </CardTitle>
                <CardDescription>
                  One plan. Everything included.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {pricingPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="font-semibold text-foreground">DealFlow</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <p>The networking CRM for finance students.</p>
        </div>
      </footer>
    </div>
  );
}
