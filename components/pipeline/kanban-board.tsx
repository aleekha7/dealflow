"use client";

import * as React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Bell, Kanban, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactDrawer } from "@/components/contacts/contact-drawer";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { EmptyState } from "@/components/empty-state";
import { TierBadge } from "@/components/tier-badge";
import { api } from "@/lib/client-api";
import { STAGES } from "@/lib/constants";
import { cn, daysSinceLabel, fullName, isDue } from "@/lib/utils";
import type { Contact, PipelineStage, Profile } from "@/types";

export function KanbanBoard({
  profile,
}: {
  profile: Pick<Profile, "full_name" | "school">;
}) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    api
      .getContacts()
      .then(({ contacts: data }) => setContacts(data))
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not load pipeline"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const byStage = React.useMemo(() => {
    const map = new Map<PipelineStage, Contact[]>();
    for (const stage of STAGES) map.set(stage, []);
    for (const contact of contacts) {
      map.get(contact.pipeline_stage)?.push(contact);
    }
    return map;
  }, [contacts]);

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const newStage = destination.droppableId as PipelineStage;
    const contact = contacts.find((c) => c.id === draggableId);
    if (!contact) return;

    // Optimistic move
    const previous = contacts;
    setContacts((c) =>
      c.map((x) =>
        x.id === draggableId ? { ...x, pipeline_stage: newStage } : x
      )
    );

    try {
      const { contact: updated } = await api.updateContact(draggableId, {
        pipeline_stage: newStage,
      });
      setContacts((c) => c.map((x) => (x.id === updated.id ? updated : x)));
      setSelected((s) => (s?.id === updated.id ? updated : s));
      toast.success(`${contact.first_name} moved to ${newStage}`);
    } catch (err) {
      setContacts(previous);
      toast.error(
        err instanceof Error ? err.message : "Could not move contact"
      );
    }
  }

  function handleUpdated(contact: Contact) {
    setContacts((c) => c.map((x) => (x.id === contact.id ? contact : x)));
    setSelected((s) => (s?.id === contact.id ? contact : s));
  }

  function handleDeleted(id: string) {
    setContacts((c) => c.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PipelineHeader onAdd={() => setFormOpen(true)} />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="space-y-6">
        <PipelineHeader onAdd={() => setFormOpen(true)} />
        <EmptyState
          icon={Kanban}
          title="Your pipeline is empty"
          description="Add contacts to start tracking your outreach from first email to coffee chat."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add your first contact
            </Button>
          }
        />
        <ContactFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSaved={(contact) => setContacts((c) => [contact, ...c])}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PipelineHeader onAdd={() => setFormOpen(true)} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageContacts = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{stage}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {stageContacts.length}
                  </span>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[12rem] space-y-2 rounded-lg border bg-muted/30 p-2 transition-colors",
                        snapshot.isDraggingOver && "border-primary/40 bg-muted"
                      )}
                    >
                      {stageContacts.map((contact, index) => (
                        <Draggable
                          key={contact.id}
                          draggableId={contact.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={
                                dragProvided.draggableProps
                                  .style as React.CSSProperties
                              }
                              onClick={() => {
                                setSelected(contact);
                                setDrawerOpen(true);
                              }}
                              className={cn(
                                "cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
                                dragSnapshot.isDragging && "shadow-lg"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight">
                                  {fullName(contact)}
                                </p>
                                {isDue(contact.reminder_date) ? (
                                  <Bell className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {contact.firm || "No firm"}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <TierBadge
                                  tier={contact.tier}
                                  className="px-2 py-0 text-[10px]"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {daysSinceLabel(contact.last_action_at)}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={(contact) => setContacts((c) => [contact, ...c])}
      />
      <ContactDrawer
        contact={selected}
        profile={profile}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}

function PipelineHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Drag contacts between stages as your outreach progresses.
        </p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add contact
      </Button>
    </div>
  );
}
