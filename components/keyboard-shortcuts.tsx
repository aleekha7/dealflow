"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { key: "N", description: "New contact" },
  { key: "G D", description: "Go to Dashboard" },
  { key: "G C", description: "Go to Contacts" },
  { key: "G P", description: "Go to Pipeline" },
  { key: "G T", description: "Go to Templates" },
  { key: "/", description: "Focus search (on Contacts page)" },
  { key: "?", description: "Show keyboard shortcuts" },
];

interface KeyboardShortcutsProps {
  onNewContact?: () => void;
  onFocusSearch?: () => void;
}

export function KeyboardShortcuts({ onNewContact, onFocusSearch }: KeyboardShortcutsProps) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = React.useState(false);
  const gRef = React.useRef(false);
  const gTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // ? = help (always works)
      if (e.key === "?" && !isInput) {
        setHelpOpen((v) => !v);
        return;
      }

      if (isInput) return;

      // G + letter navigation
      if (gRef.current) {
        gRef.current = false;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        switch (e.key.toLowerCase()) {
          case "d": router.push("/dashboard"); return;
          case "c": router.push("/contacts"); return;
          case "p": router.push("/pipeline"); return;
          case "t": router.push("/templates"); return;
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        gRef.current = true;
        gTimerRef.current = setTimeout(() => { gRef.current = false; }, 1000);
        return;
      }

      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        onNewContact?.();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, onNewContact, onFocusSearch]);

  return (
    <>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Keyboard shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">{s.description}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
