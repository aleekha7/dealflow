"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  FileUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactDrawer } from "@/components/contacts/contact-drawer";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { CsvImportDialog } from "@/components/contacts/csv-import-dialog";
import { EmptyState } from "@/components/empty-state";
import { TierBadge } from "@/components/tier-badge";
import { api } from "@/lib/client-api";
import { STAGES, TIERS } from "@/lib/constants";
import { fullName } from "@/lib/utils";
import type { Contact, Profile } from "@/types";

const ALL = "all";

export function ContactsView({
  profile,
}: {
  profile: Pick<Profile, "full_name" | "school">;
}) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState(ALL);
  const [stageFilter, setStageFilter] = React.useState(ALL);
  const [formOpen, setFormOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);
  const [selected, setSelected] = React.useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const hasFilters = query !== "" || tierFilter !== ALL || stageFilter !== ALL;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { contacts: data } = await api.getContacts({
        q: query || undefined,
        tier: tierFilter !== ALL ? tierFilter : undefined,
        stage: stageFilter !== ALL ? stageFilter : undefined,
      });
      setContacts(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not load contacts"
      );
    } finally {
      setLoading(false);
    }
  }, [query, tierFilter, stageFilter]);

  // Debounced reload on search/filter changes
  React.useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  function handleSaved(contact: Contact, isNew: boolean) {
    if (isNew) {
      setContacts((c) => [contact, ...c]);
    } else {
      setContacts((c) => c.map((x) => (x.id === contact.id ? contact : x)));
      setSelected((s) => (s?.id === contact.id ? contact : s));
    }
  }

  function handleUpdated(contact: Contact) {
    setContacts((c) => c.map((x) => (x.id === contact.id ? contact : x)));
    setSelected((s) => (s?.id === contact.id ? contact : s));
  }

  async function handleDelete(contact: Contact) {
    if (
      !window.confirm(`Delete ${fullName(contact)}? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await api.deleteContact(contact.id);
      toast.success("Contact deleted");
      handleDeleted(contact.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  function handleDeleted(id: string) {
    setContacts((c) => c.filter((x) => x.id !== id));
    if (selected?.id === id) {
      setSelected(null);
      setDrawerOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Everyone in your network, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4" />
            Import CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or firm…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tiers</SelectItem>
            {TIERS.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table / empty state */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No contacts match" : "No contacts yet"}
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Add your first contact or import your existing list from a CSV to get started."
          }
          action={
            hasFilters ? undefined : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add your first contact
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Firm</TableHead>
                <TableHead className="hidden lg:table-cell">Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="hidden md:table-cell">Stage</TableHead>
                <TableHead className="hidden lg:table-cell">Added</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(contact);
                    setDrawerOpen(true);
                  }}
                >
                  <TableCell>
                    <p className="font-medium">{fullName(contact)}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {contact.firm}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.firm || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {contact.role || "—"}
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={contact.tier} />
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {contact.pipeline_stage}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {format(new Date(contact.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Contact actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(contact);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(contact)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        onSaved={handleSaved}
      />
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={load}
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
