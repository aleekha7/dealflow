"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { TIERS } from "@/lib/constants";
import type { Contact, FirmTier } from "@/types";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this contact instead of creating one. */
  contact?: Contact | null;
  onSaved: (contact: Contact, isNew: boolean) => void;
}

const emptyForm = {
  first_name: "",
  last_name: "",
  firm: "",
  role: "",
  email: "",
  linkedin_url: "",
  tier: "Other" as FirmTier,
  notes: "",
};

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: ContactFormDialogProps) {
  const [form, setForm] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(contact);

  React.useEffect(() => {
    if (open) {
      setForm(
        contact
          ? {
              first_name: contact.first_name,
              last_name: contact.last_name,
              firm: contact.firm,
              role: contact.role,
              email: contact.email,
              linkedin_url: contact.linkedin_url,
              tier: contact.tier,
              notes: contact.notes,
            }
          : emptyForm
      );
    }
  }, [open, contact]);

  function set<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && contact) {
        const { contact: updated } = await api.updateContact(contact.id, form);
        toast.success("Contact updated");
        onSaved(updated, false);
      } else {
        const { contact: created } = await api.createContact(form);
        toast.success("Contact added");
        onSaved(created, true);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contact" : "Add contact"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this contact's details."
              : "Add a new contact to your network."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firm">Firm</Label>
              <Input
                id="firm"
                placeholder="Goldman Sachs"
                value={form.firm}
                onChange={(e) => set("firm", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / title</Label>
              <Input
                id="role"
                placeholder="Investment Banking Analyst"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@firm.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier">Firm tier</Label>
              <Select
                value={form.tier}
                onValueChange={(v) => set("tier", v as FirmTier)}
              >
                <SelectTrigger id="tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              placeholder="https://linkedin.com/in/..."
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Met at the spring networking event…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
