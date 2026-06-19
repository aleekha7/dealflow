"use client";

import * as React from "react";
import { ClipboardList, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Contact, Profile } from "@/types";

interface PrepSheet {
  firmBackground: string;
  questionsTheyMightAsk: string[];
  questionsToAskThem: string[];
  talkingPoints: string[];
}

interface PrepSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  profile: Pick<Profile, "full_name" | "school">;
}

export function PrepSheetDialog({
  open,
  onOpenChange,
  contact,
  profile,
}: PrepSheetDialogProps) {
  const [sheet, setSheet] = React.useState<PrepSheet | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (sheet) return; // don't re-fetch if already loaded for this contact
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function generate() {
    setLoading(true);
    setSheet(null);
    try {
      const res = await fetch("/api/ai/prep-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            first_name: contact.first_name,
            last_name: contact.last_name,
            firm: contact.firm,
            role: contact.role,
            tier: contact.tier,
            notes: contact.notes || undefined,
          },
          profile,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Generation failed");
      }
      setSheet(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate prep sheet");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  // Reset when contact changes
  React.useEffect(() => {
    setSheet(null);
  }, [contact.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Coffee chat prep — {contact.first_name} {contact.last_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Generating prep sheet…</p>
          </div>
        ) : sheet ? (
          <div className="space-y-5 text-sm">
            <Section title="About the firm">
              <p className="leading-relaxed text-muted-foreground">
                {sheet.firmBackground}
              </p>
            </Section>

            <Separator />

            <Section title="Questions they might ask you">
              <ul className="space-y-1.5">
                {sheet.questionsTheyMightAsk.map((q, i) => (
                  <li key={i} className="flex gap-2 text-muted-foreground">
                    <span className="mt-0.5 shrink-0 font-semibold text-foreground">
                      {i + 1}.
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </Section>

            <Separator />

            <Section title={`Questions to ask ${contact.first_name}`}>
              <ul className="space-y-1.5">
                {sheet.questionsToAskThem.map((q, i) => (
                  <li key={i} className="flex gap-2 text-muted-foreground">
                    <span className="mt-0.5 shrink-0 font-semibold text-foreground">
                      {i + 1}.
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </Section>

            <Separator />

            <Section title="Talking points">
              <ul className="space-y-1.5">
                {sheet.talkingPoints.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-foreground">·</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </Section>

            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={generate}>
                <Sparkles className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">{title}</h4>
      {children}
    </div>
  );
}
