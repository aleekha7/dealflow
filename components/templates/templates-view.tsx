"use client";

import * as React from "react";
import {
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";
import { api } from "@/lib/client-api";
import { TEMPLATE_CATEGORIES } from "@/lib/constants";
import { contextFromContact, fillTemplate } from "@/lib/merge-tags";
import type { Profile, Template } from "@/types";

const SAMPLE_CONTACT = {
  first_name: "Jane",
  firm: "Goldman Sachs",
  role: "Investment Banking Analyst",
};

export function TemplatesView({
  profile,
}: {
  profile: Pick<Profile, "full_name" | "school">;
}) {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Template | null>(null);
  const [previewing, setPreviewing] = React.useState<Template | null>(null);

  React.useEffect(() => {
    api
      .getTemplates()
      .then(({ templates: data }) => setTemplates(data))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not load templates"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(template: Template, isNew: boolean) {
    setTemplates((t) =>
      isNew
        ? [...t, template]
        : t.map((x) => (x.id === template.id ? template : x))
    );
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Delete the "${template.name}" template?`)) return;
    try {
      await api.deleteTemplate(template.id);
      toast.success("Template deleted");
      setTemplates((t) => t.filter((x) => x.id !== template.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const ctx = contextFromContact(SAMPLE_CONTACT, profile);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Email templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Reusable outreach emails with merge tags like{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              {"{{first_name}}"}
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              {"{{firm}}"}
            </code>
            .
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No templates yet"
          description="Create your first email template to speed up your outreach. Merge tags personalize each email automatically."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create your first template
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {TEMPLATE_CATEGORIES.map((category) => {
            const inCategory = templates.filter(
              (t) => t.category === category
            );
            if (inCategory.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.map((template) => (
                    <Card key={template.id} className="flex flex-col">
                      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                        <div className="space-y-1 pr-2">
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          <Badge variant="secondary">{template.category}</Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              aria-label="Template actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setPreviewing(template)}
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(template);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(template)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <CardDescription className="line-clamp-1 font-medium text-foreground">
                          {template.subject || "(no subject)"}
                        </CardDescription>
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                          {template.body}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSaved={handleSaved}
      />

      {/* Preview with sample data */}
      <Dialog
        open={Boolean(previewing)}
        onOpenChange={(open) => !open && setPreviewing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
            <DialogDescription>
              Previewed with sample contact data (Jane, Goldman Sachs).
            </DialogDescription>
          </DialogHeader>
          {previewing ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subject
                </p>
                <p className="text-sm font-medium">
                  {fillTemplate(previewing.subject, ctx) || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Body
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {fillTemplate(previewing.body, ctx)}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
