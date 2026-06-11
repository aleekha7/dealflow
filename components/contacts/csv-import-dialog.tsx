"use client";

import * as React from "react";
import Papa from "papaparse";
import { Download, FileUp, Loader2 } from "lucide-react";
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
import { api, type ContactInput } from "@/lib/client-api";
import { TIERS } from "@/lib/constants";
import type { FirmTier } from "@/types";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const SAMPLE_CSV =
  "first_name,last_name,firm,role,email,linkedin_url,tier,notes\n" +
  'Jane,Doe,Goldman Sachs,IB Analyst,jane.doe@gs.com,https://linkedin.com/in/janedoe,Bulge Bracket,Met at info session\n' +
  'John,Smith,Evercore,Associate,john.smith@evercore.com,,Elite Boutique,Alum from my school\n';

/** Normalize a header like "First Name" or "FIRST_NAME" to "first_name". */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

const HEADER_ALIASES: Record<string, string> = {
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  firm: "firm",
  firm_name: "firm",
  company: "firm",
  role: "role",
  title: "role",
  role_title: "role",
  position: "role",
  email: "email",
  email_address: "email",
  linkedin_url: "linkedin_url",
  linkedin: "linkedin_url",
  tier: "tier",
  firm_tier: "tier",
  notes: "notes",
  note: "notes",
};

function normalizeTier(value: string): FirmTier {
  const cleaned = value.trim().toLowerCase();
  const match = TIERS.find((t) => t.toLowerCase() === cleaned);
  return match ?? "Other";
}

function rowsToContacts(rows: Record<string, string>[]): {
  contacts: ContactInput[];
  skipped: number;
} {
  const contacts: ContactInput[] = [];
  let skipped = 0;

  for (const raw of rows) {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      if (field && typeof value === "string") {
        mapped[field] = value.trim();
      }
    }
    if (!mapped.first_name) {
      skipped++;
      continue;
    }
    contacts.push({
      first_name: mapped.first_name,
      last_name: mapped.last_name ?? "",
      firm: mapped.firm ?? "",
      role: mapped.role ?? "",
      email: mapped.email ?? "",
      linkedin_url: mapped.linkedin_url ?? "",
      tier: normalizeTier(mapped.tier ?? ""),
      notes: mapped.notes ?? "",
    });
  }

  return { contacts, skipped };
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: CsvImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsed, setParsed] = React.useState<{
    contacts: ContactInput[];
    skipped: number;
  } | null>(null);
  const [importing, setImporting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setParsed(null);
    }
  }, [open]);

  function handleFile(f: File) {
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const outcome = rowsToContacts(results.data);
        if (outcome.contacts.length === 0) {
          toast.error(
            "No valid rows found. Make sure the CSV has a first_name column."
          );
          setParsed(null);
          return;
        }
        if (outcome.contacts.length > 1000) {
          toast.error("Imports are limited to 1,000 contacts at a time.");
          setParsed(null);
          return;
        }
        setParsed(outcome);
      },
      error: () => {
        toast.error("Could not parse that file. Is it a valid CSV?");
        setParsed(null);
      },
    });
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    try {
      const { imported } = await api.importContacts(parsed.contacts);
      toast.success(
        `Imported ${imported} contact${imported === 1 ? "" : "s"}`
      );
      onImported();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dealflow-contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns like first_name, last_name, firm, role,
            email, linkedin_url, tier, and notes. Header names are matched
            flexibly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50"
          >
            <FileUp className="h-6 w-6" />
            {file ? (
              <span className="font-medium text-foreground">{file.name}</span>
            ) : (
              <span>Click to choose a CSV file</span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {parsed ? (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p className="font-medium">
                {parsed.contacts.length} contact
                {parsed.contacts.length === 1 ? "" : "s"} ready to import
              </p>
              {parsed.skipped > 0 ? (
                <p className="mt-1 text-muted-foreground">
                  {parsed.skipped} row{parsed.skipped === 1 ? "" : "s"} skipped
                  (missing first name).
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={downloadSample}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Download a sample CSV
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!parsed || importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Import{parsed ? ` ${parsed.contacts.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
