"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  Kanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { PLAN_NAME } from "@/lib/constants";
import { cn, trialDaysLeft } from "@/lib/utils";
import type { Profile } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/templates", label: "Templates", icon: Mail },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

function useOverdueCount() {
  const [count, setCount] = React.useState(0);
  const pathname = usePathname();

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .lt("reminder_date", startOfToday.toISOString())
      .then(({ count: c }) => {
        if (!cancelled) setCount(c ?? 0);
      });

    return () => {
      cancelled = true;
    };
    // Re-check whenever the user navigates — keeps the badge fresh after
    // reminders are completed or rescheduled.
  }, [pathname]);

  return count;
}

function NavLinks({
  overdueCount,
  onNavigate,
}: {
  overdueCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.href === "/dashboard" && overdueCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {overdueCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const overdueCount = useOverdueCount();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const onTrial = profile.subscription_status === "trial";
  const daysLeft = trialDaysLeft(profile.trial_ends_at);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-4 font-bold">
        <TrendingUp className="h-5 w-5" />
        <span>DealFlow</span>
      </div>
      <Separator />
      <div className="flex flex-1 flex-col p-3">
        <NavLinks
          overdueCount={overdueCount}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className="mt-auto space-y-3">
          {onTrial ? (
            <div className="rounded-md border bg-muted/50 p-3 text-xs">
              <p className="font-semibold">
                {daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in trial`
                  : "Trial ends today"}
              </p>
              <p className="mt-1 text-muted-foreground">
                Upgrade to {PLAN_NAME} to keep your pipeline after the trial.
              </p>
              <Button size="sm" className="mt-2 w-full" asChild>
                <Link href="/billing">Upgrade</Link>
              </Button>
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-md border p-2">
            <div className="min-w-0 px-1">
              <p className="truncate text-sm font-medium">
                {profile.full_name || profile.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <span className="flex items-center gap-2 font-bold">
              <TrendingUp className="h-5 w-5" />
              DealFlow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                overdueCount > 0
                  ? `${overdueCount} overdue reminders`
                  : "Reminders"
              }
              className="relative"
              asChild
            >
              <Link href="/dashboard">
                <Bell className="h-5 w-5" />
                {overdueCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-red-600" />
                ) : null}
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
