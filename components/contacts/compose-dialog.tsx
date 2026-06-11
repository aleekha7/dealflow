"use client";

import * as React from "react";
import { Check, Copy, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/client-api";
import { contextFromContact, fillTemplate } from "@/lib/merge-tags";
import type { Contact, Profile, Template } from "@/types";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  profile: Pick<Profile, "full_name" | "school">;
  onContactUpdated?: (contact: Contact) => void;
}

export function ComposeDialog({
  open,
  onOpenChange,
  contact,
  profile,
  onContactUpdated,
}: ComposeDialogProps) {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);
  const [marking, setMarking] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .getTemplates()
      .then(({ templates: t }) => {
        setTemplates(t);
        if (t.length > 0 && !templateId) setTemplateId(t[0].id);
      })
      .catch(() => toast.error("Could not load templates"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = templates.find((t) => t.id === templateId) ?? null;
  const ctx = contextFromContact(contact, profile);
  const subject = selected ? fillTemplate(selected.subject, ctx) : "";
  const body = selected ? fillTemplate(selected.body, ctx) : "";

  async function handleCopy() {
    await navigator.clipboard.writeText(
      subject ? `Subject: ${subject}\n\n${body}` : body
    );
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleMailto() {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const qs = params.toString().replace(/\+/g, "%20");
    window.location.href = `mailto:${encodeURIComponent(contact.email)}?${qs}`;
  }

  async function handleMarkEmailed() {
    setMarking(true);
    try {
      const { contact: updated } = await api.updateContact(contact.id, {
        pipeline_stage: "Emailed",
      });
      toast.success("Logged as emailed and moved to the Emailed stage");
      onContactUpdated?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log email");
    } finally {
      setMarking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Compose outreach to {contact.first_name}
          </DialogTitle>
          <DialogDescription>
            Pick a template — merge tags are filled in with{" "}
            {contact.first_name}&apos;s details automatically.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            You don&apos;t have any templates yet. Create one on the Templates
            page first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected ? (
              <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    To
                  </p>
                  <p className="text-sm">
                    {contact.email || (
                      <span className="text-muted-foreground">
                        No email on file
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{subject || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Body
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {selected ? (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy
            </Button>
            <Button
              variant="outline"
              onClick={handleMailto}
              disabled={!contact.email}
            >
              <Mail className="h-4 w-4" />
              Open in mail app
            </Button>
            <Button onClick={handleMarkEmailed} disabled={marking}>
              {marking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Mark as emailed
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
