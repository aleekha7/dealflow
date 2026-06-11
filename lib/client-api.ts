import type { Contact, OutreachLogEntry, Profile, Template } from "@/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`
    );
  }
  return data as T;
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  firm: string;
  role: string;
  email: string;
  linkedin_url: string;
  tier: string;
  notes: string;
  pipeline_stage?: string;
  reminder_date?: string | null;
}

export const api = {
  // Contacts
  getContacts: (params?: { q?: string; tier?: string; stage?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.tier) search.set("tier", params.tier);
    if (params?.stage) search.set("stage", params.stage);
    const qs = search.toString();
    return request<{ contacts: Contact[] }>(
      `/api/contacts${qs ? `?${qs}` : ""}`
    );
  },
  createContact: (input: ContactInput) =>
    request<{ contact: Contact }>("/api/contacts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateContact: (id: string, input: Partial<ContactInput>) =>
    request<{ contact: Contact }>(`/api/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteContact: (id: string) =>
    request<{ success: true }>(`/api/contacts/${id}`, { method: "DELETE" }),
  importContacts: (contacts: ContactInput[]) =>
    request<{ imported: number }>("/api/contacts/import", {
      method: "POST",
      body: JSON.stringify({ contacts }),
    }),

  // Templates
  getTemplates: () => request<{ templates: Template[] }>("/api/templates"),
  createTemplate: (input: Partial<Template>) =>
    request<{ template: Template }>("/api/templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateTemplate: (id: string, input: Partial<Template>) =>
    request<{ template: Template }>(`/api/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTemplate: (id: string) =>
    request<{ success: true }>(`/api/templates/${id}`, { method: "DELETE" }),

  // Outreach log
  getLog: (contactId: string) =>
    request<{ log: OutreachLogEntry[] }>(`/api/log?contact_id=${contactId}`),
  addLog: (input: { contact_id: string; action_type: string; note?: string }) =>
    request<{ entry: OutreachLogEntry }>("/api/log", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Profile
  updateProfile: (input: { full_name: string; school: string }) =>
    request<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  // Billing
  startCheckout: () =>
    request<{ url: string }>("/api/stripe/checkout", { method: "POST" }),
  openPortal: () =>
    request<{ url: string }>("/api/stripe/portal", { method: "POST" }),
};
