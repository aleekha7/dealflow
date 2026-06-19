"use client";

import * as React from "react";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "dealflow:weekly-goal";

interface WeeklyGoalProps {
  emailedThisWeek: number;
}

export function WeeklyGoal({ emailedThisWeek }: WeeklyGoalProps) {
  const [goal, setGoal] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setGoal(Number(stored));
  }, []);

  function saveGoal() {
    const n = parseInt(draft, 10);
    if (!n || n < 1) return;
    localStorage.setItem(STORAGE_KEY, String(n));
    setGoal(n);
    setEditing(false);
  }

  function clearGoal() {
    localStorage.removeItem(STORAGE_KEY);
    setGoal(null);
    setEditing(false);
  }

  if (!goal && !editing) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            Set a weekly outreach goal
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft("");
              setEditing(true);
            }}
          >
            Set goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4">
          <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">Email</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            className="h-8 w-20"
            autoFocus
            placeholder="10"
          />
          <span className="text-sm">people this week</span>
          <Button size="sm" onClick={saveGoal}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </CardContent>
      </Card>
    );
  }

  const pct = Math.min(100, Math.round((emailedThisWeek / goal!) * 100));
  const done = emailedThisWeek >= goal!;

  return (
    <Card className={done ? "border-green-200 dark:border-green-900" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Weekly goal
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => {
              setDraft(String(goal));
              setEditing(true);
            }}
          >
            Edit
          </Button>
        </div>
        <CardDescription>
          {done
            ? `Goal reached! You emailed ${emailedThisWeek} people this week.`
            : `${emailedThisWeek} of ${goal} people emailed this week`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct}% complete</span>
          <button onClick={clearGoal} className="hover:text-foreground">
            Clear goal
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
