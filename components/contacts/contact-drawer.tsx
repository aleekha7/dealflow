"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Bell,
  Briefcase,
  CalendarPlus,
  Coffee,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  PenLine,
  Reply,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ComposeDialog } from "@/components/contacts/compose-dialog";
import { TierBadge } from "@/components/tier-badge";
import { api } from "@/lib/client-api";
import { ACTION_TYPES, STAGES } from "@/lib/constants";
import { daysSinceLabel, fullName, isOverdue } from "@/lib/utils";
import type {
  ActionType,
  Contact,
  OutreachLogEntry,
  PipelineStage,
  Profile,
} from "@/types";

const ACTION_ICONS: Record<ActionType, React.ComponentType<{ className?: string }>> = {
  Emailed: Send,
  "Followed Up": Mail,
  Replied: Reply,
  "Coffee Chat": Coffee,
  "Note Added": PenLine,
};

interface ContactDrawerProps {
  contact: Contact | null;
  profile: Pick<Profile, "full_name" | "school">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (contact: Contact) => void;
  onDeleted: (id: string) => void;
}

export function ContactDrawer({
  contact,
  profile,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: ContactDrawerProps) {
  const [log, setLog] = React.useState<OutreachLogEntry[]>([]);
  const [logLoading, setLogLoading] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [reminderInput, setReminderInput] = React.useState("");
  const [savingReminder, setSavingReminder] = React.useState(false);
  const [logAction, setLogAction] = React.useState<ActionType>("Emailed");
  const [logNote, setLogNote] = React.useState("");
  const [addingLog, setAddingLog] = React.useState(false);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const refreshLog = React.useCallback((contactId: string) => {
    setLogLoading(true);
    api
      .getLog(contactId)
      .then(({ log: entries }) => setLog(entries))
      .catch(() => toast.error("Could not load outreach history"))
      .finally(() => setLogLoading(false));
  }, []);

  React.useEffect(() => {
    if (open && contact) {
      setNotes(contact.notes);
      setReminderInput(
        contact.reminder_date
          ? format(new Date(contact.reminder_date), "yyyy-MM-dd")
          : ""
      );
      setLogNote("");
      refreshLog(contact.id);
    }
    // Only re-sync when a different contact is opened — not on every parent
    // re-render of the same contact object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id, refreshLog]);

  if (!contact) return null;

  async function handleStageChange(stage: PipelineStage) {
    if (!contact) return;
    try {
      const { contact: updated } = await api.updateContact(contact.id, {
        pipeline_stage: stage,
      });
      toast.success(`Moved to ${stage}`);
      onUpdated(updated);
      refreshLog(contact.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move stage");
    }
  }

  async function handleSaveNotes() {
    if (!contact) return;
    setSavingNotes(true);
    try {
      const { contact: updated } = await api.updateContact(contact.id, {
        notes,
      });
      toast.success("Notes saved");
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleSaveReminder() {
    if (!contact) return;
    setSavingReminder(true);
    try {
      const reminder_date = reminderInput
        ? new Date(`${reminderInput}T09:00:00`).toISOString()
        : null;
      const { contact: updated } = await api.updateContact(contact.id, {
        reminder_date,
      });
      toast.success(reminder_date ? "Reminder set" : "Reminder cleared");
      onUpdated(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save reminder"
      );
    } finally {
      setSavingReminder(false);
    }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;
    setAddingLog(true);
    try {
      await api.addLog({
        contact_id: contact.id,
        action_type: logAction,
        note: logNote,
      });
      toast.success("Interaction logged");
      setLogNote("");
      refreshLog(contact.id);
      // last_action_at changed server-side; reflect it locally
      onUpdated({ ...contact, last_action_at: new Date().toISOString() });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not log interaction"
      );
    } finally {
      setAddingLog(false);
    }
  }

  async function handleDelete() {
    if (!contact) return;
    if (!window.confirm(`Delete ${fullName(contact)}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteContact(contact.id);
      toast.success("Contact deleted");
      onDeleted(contact.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pr-8 text-left">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl">{fullName(contact)}</SheetTitle>
              <TierBadge tier={contact.tier} />
            </div>
            <SheetDescription>
              {[contact.role, contact.firm].filter(Boolean).join(" · ") ||
                "No firm details yet"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Send className="h-4 w-4" />
                Compose outreach
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>

            {/* Stage */}
            <div className="space-y-2">
              <Label>Pipeline stage</Label>
              <Select
                value={contact.pipeline_stage}
                onValueChange={(v) => handleStageChange(v as PipelineStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Last action {daysSinceLabel(contact.last_action_at)}
              </p>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold">Contact info</h4>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="truncate text-foreground underline-offset-4 hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  "No email"
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Linkedin className="h-4 w-4 shrink-0" />
                {contact.linkedin_url ? (
                  <a
                    href={contact.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-foreground underline-offset-4 hover:underline"
                  >
                    LinkedIn profile
                  </a>
                ) : (
                  "No LinkedIn"
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0" />
                Added {format(new Date(contact.created_at), "MMM d, yyyy")}
              </div>
            </div>

            <Separator />

            {/* Follow-up reminder */}
            <div className="space-y-2">
              <Label htmlFor="reminder" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Follow-up reminder
                {isOverdue(contact.reminder_date) ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                    Overdue
                  </span>
                ) : null}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="reminder"
                  type="date"
                  value={reminderInput}
                  onChange={(e) => setReminderInput(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleSaveReminder}
                  disabled={savingReminder}
                >
                  {savingReminder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarPlus className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clear the date and save to remove the reminder. Due reminders
                appear on your dashboard and in the daily digest email.
              </p>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="drawer-notes">Notes</Label>
              <Textarea
                id="drawer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Background, talking points, things they mentioned…"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === contact.notes}
              >
                {savingNotes ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save notes
              </Button>
            </div>

            <Separator />

            {/* Log an interaction */}
            <form onSubmit={handleAddLog} className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Log an interaction
              </Label>
              <div className="flex gap-2">
                <Select
                  value={logAction}
                  onValueChange={(v) => setLogAction(v as ActionType)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Optional note"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
              </div>
              <Button size="sm" type="submit" disabled={addingLog}>
                {addingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add to log
              </Button>
            </form>

            <Separator />

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Outreach history</h4>
              {logLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : log.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No interactions logged yet. Mark this contact as emailed or
                  log a coffee chat to start the timeline.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {log.map((entry) => {
                    const Icon = ACTION_ICONS[entry.action_type] ?? PenLine;
                    return (
                      <li key={entry.id} className="relative">
                        <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border bg-background">
                          <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                        </span>
                        <p className="text-sm font-medium">
                          {entry.action_type}
                        </p>
                        {entry.note ? (
                          <p className="text-sm text-muted-foreground">
                            {entry.note}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(entry.created_at),
                            "MMM d, yyyy · h:mm a"
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        contact={contact}
        profile={profile}
        onContactUpdated={(updated) => {
          onUpdated(updated);
          refreshLog(updated.id);
        }}
      />
    </>
  );
}
