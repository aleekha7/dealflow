"use client";

import * as React from "react";
import { Check, Copy, Loader2, Mail, Send, Sparkles } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { contextFromContact, fillTemplate } from "@/lib/merge-tags";
import type { Contact, Profile, Template } from "@/types";

type Tone = "professional" | "conversational" | "concise";

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
  // Template mode state
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [templateId, setTemplateId] = React.useState<string>("");

  // AI mode state
  const [tone, setTone] = React.useState<Tone>("professional");
  const [extraContext, setExtraContext] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [aiSubject, setAiSubject] = React.useState("");
  const [aiBody, setAiBody] = React.useState("");

  // Shared state
  const [copied, setCopied] = React.useState(false);
  const [marking, setMarking] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"template" | "ai">("template");

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
    // Reset AI output when dialog opens
    setAiSubject("");
    setAiBody("");
    setExtraContext("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = templates.find((t) => t.id === templateId) ?? null;
  const ctx = contextFromContact(contact, profile);
  const templateSubject = selected ? fillTemplate(selected.subject, ctx) : "";
  const templateBody = selected ? fillTemplate(selected.body, ctx) : "";

  const activeSubject = activeTab === "template" ? templateSubject : aiSubject;
  const activeBody = activeTab === "template" ? templateBody : aiBody;
  const hasContent =
    activeTab === "template" ? !!selected : !!(aiSubject || aiBody);

  async function handleGenerate() {
    setGenerating(true);
    setAiSubject("");
    setAiBody("");
    try {
      const res = await fetch("/api/ai/generate-email", {
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
          tone,
          extraContext: extraContext || undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Generation failed");
      }
      const { subject, body } = await res.json();
      setAiSubject(subject);
      setAiBody(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate email");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(
      activeSubject ? `Subject: ${activeSubject}\n\n${activeBody}` : activeBody
    );
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleMailto() {
    const params = new URLSearchParams();
    if (activeSubject) params.set("subject", activeSubject);
    if (activeBody) params.set("body", activeBody);
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
          <DialogTitle>Compose outreach to {contact.first_name}</DialogTitle>
          <DialogDescription>
            Use a template or let AI draft a personalized email for you.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "template" | "ai")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          {/* ── Template tab ── */}
          <TabsContent value="template" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You don&apos;t have any templates yet. Create one on the
                Templates page first.
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
                      <p className="text-sm font-medium">
                        {templateSubject || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Body
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {templateBody}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          {/* ── AI Generate tab ── */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v as Tone)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Extra context (optional)</Label>
                <Input
                  placeholder="e.g. met at Wharton career fair"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {generating ? "Generating…" : aiSubject ? "Regenerate" : "Generate email"}
            </Button>

            {(aiSubject || aiBody) && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subject
                  </p>
                  <Input
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Body
                  </p>
                  <Textarea
                    value={aiBody}
                    onChange={(e) => setAiBody(e.target.value)}
                    className="min-h-[200px] bg-background leading-relaxed"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {hasContent ? (
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
