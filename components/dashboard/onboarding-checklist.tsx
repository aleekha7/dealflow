"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DISMISSED_KEY = "dealflow:onboarding-dismissed";

interface OnboardingChecklistProps {
  hasContacts: boolean;
  hasTemplates: boolean;
  hasEmailed: boolean;
}

export function OnboardingChecklist({
  hasContacts,
  hasTemplates,
  hasEmailed,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setDismissed(!!localStorage.getItem(DISMISSED_KEY));
  }, []);

  const allDone = hasContacts && hasTemplates && hasEmailed;

  // Auto-dismiss when all steps done
  React.useEffect(() => {
    if (allDone && mounted) {
      setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, "1");
        setDismissed(true);
      }, 3000);
    }
  }, [allDone, mounted]);

  if (!mounted || dismissed) return null;

  const steps = [
    {
      done: hasContacts,
      label: "Add your first contact",
      hint: "Go to Contacts and add someone you want to reach out to.",
      href: "/contacts",
      cta: "Add contact",
    },
    {
      done: hasTemplates,
      label: "Create an email template",
      hint: "Build a reusable cold outreach email with merge tags.",
      href: "/templates",
      cta: "Create template",
    },
    {
      done: hasEmailed,
      label: "Send your first outreach",
      hint: "Open a contact, compose an email, and mark it as sent.",
      href: "/contacts",
      cta: "Compose email",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-blue-200 dark:border-blue-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {allDone ? "You're all set! 🎉" : "Get started with DealFlow"}
            </CardTitle>
            <CardDescription>
              {allDone
                ? "Checklist complete — disappearing in a moment."
                : `${completedCount} of ${steps.length} steps complete`}
            </CardDescription>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(DISMISSED_KEY, "1");
              setDismissed(true);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>
                {step.label}
              </p>
              {!step.done && (
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              )}
            </div>
            {!step.done && (
              <Button size="sm" variant="outline" className="shrink-0" asChild>
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
