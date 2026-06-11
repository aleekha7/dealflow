"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import type { Profile } from "@/types";

export function SettingsView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [school, setSchool] = React.useState(profile.school);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({ full_name: fullName, school });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your profile details are used to fill the{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            {"{{your_name}}"}
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            {"{{your_school}}"}
          </code>{" "}
          merge tags in your email templates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>How you sign your outreach emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">
                Your login email can&apos;t be changed here.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full name</Label>
              <Input
                id="settings-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-school">School</Label>
              <Input
                id="settings-school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="University of Michigan"
              />
            </div>
            <Button
              type="submit"
              disabled={
                saving ||
                (fullName === profile.full_name && school === profile.school)
              }
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
