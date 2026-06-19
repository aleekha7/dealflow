"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Download,
  FileUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
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
import { ComposeDialog } from "@/components/contacts/compose-dialog";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
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
  const [composeContact, setComposeContact] = React.useState<Contact | null>(null);
  const [linkedinBannerDismissed, setLinkedinBannerDismissed] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [sortKey, setSortKey] = React.useState<"name" | "firm" | "stage" | "created_at" | "last_action_at" | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

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

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedContacts = React.useMemo(() => {
    if (!sortKey) return contacts;
    return [...contacts].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "name") { av = fullName(a); bv = fullName(b); }
      else if (sortKey === "firm") { av = a.firm; bv = b.firm; }
      else if (sortKey === "stage") { av = a.pipeline_stage; bv = b.pipeline_stage; }
      else if (sortKey === "created_at") { av = a.created_at; bv = b.created_at; }
      else if (sortKey === "last_action_at") { av = a.last_action_at; bv = b.last_action_at; }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, sortKey, sortDir]);

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />;
  }

  function exportCsv(rows: Contact[]) {
    const headers = ["first_name","last_name","firm","role","email","linkedin_url","tier","pipeline_stage","notes"];
    const lines = [
      headers.join(","),
      ...rows.map((c) =>
        headers.map((h) => {
          const val = String((c as unknown as Record<string, unknown>)[h] ?? "");
          return `"${val.replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dealflow-contacts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <KeyboardShortcuts
        onNewContact={() => { setEditing(null); setFormOpen(true); }}
        onFocusSearch={() => searchRef.current?.focus()}
      />
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
          <Button variant="outline" onClick={() => exportCsv(contacts)} disabled={contacts.length === 0}>
            <Download className="h-4 w-4" />
            Export
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

      {/* LinkedIn import banner */}
      {!linkedinBannerDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
          <div className="flex-1 text-blue-900 dark:text-blue-200">
            <span className="font-medium">Import your LinkedIn connections.</span>{" "}
            Go to LinkedIn → Settings &amp; Privacy → Data Privacy → Get a copy of your data → Connections → Request archive. LinkedIn will email you a CSV — upload it here with the{" "}
            <button
              className="underline underline-offset-2 font-medium"
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </button>{" "}
            button.
          </div>
          <button
            onClick={() => setLinkedinBannerDismissed(true)}
            className="mt-0.5 shrink-0 text-blue-500 hover:text-blue-700 dark:text-blue-400"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
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
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Name<SortIcon col="name" />
                </TableHead>
                <TableHead className="hidden cursor-pointer select-none md:table-cell" onClick={() => handleSort("firm")}>
                  Firm<SortIcon col="firm" />
                </TableHead>
                <TableHead className="hidden lg:table-cell">Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="hidden cursor-pointer select-none md:table-cell" onClick={() => handleSort("stage")}>
                  Stage<SortIcon col="stage" />
                </TableHead>
                <TableHead className="hidden cursor-pointer select-none lg:table-cell" onClick={() => handleSort("created_at")}>
                  Added<SortIcon col="created_at" />
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map((contact) => (
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Compose email"
                        onClick={() => setComposeContact(contact)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
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
                    </div>
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
      {composeContact && (
        <ComposeDialog
          open={!!composeContact}
          onOpenChange={(o) => { if (!o) setComposeContact(null); }}
          contact={composeContact}
          profile={profile}
          onContactUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
