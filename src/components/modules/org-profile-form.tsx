"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "@/components/modules/logo-uploader";
import { OrgGapsNotice } from "@/components/modules/org-gaps-notice";
import { findOrgGaps } from "@/lib/org-completeness";
import { Building2, Save, Loader2 } from "lucide-react";
import { MdSearch } from "react-icons/md";

export interface OrgFormValues {
  name: string;
  legalName: string;
  vatNumber: string;
  taxOffice: string;
  registryNo: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  website: string;
  domains: string;
}

const CONTACT_ROWS = [0, 1, 2, 3];

export function OrgProfileForm({
  initial,
  logo,
  phones,
  emails,
  action,
}: {
  initial: OrgFormValues;
  logo: string | null;
  phones: { label: string; number: string }[];
  emails: { label: string; address: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [form, setForm] = useState<OrgFormValues>(initial);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set =
    <K extends keyof OrgFormValues>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Ζωντανός υπολογισμός ελλείψεων — ενημερώνεται καθώς συμπληρώνεις.
  const gaps = findOrgGaps({
    ...form,
    domains: form.domains.split(/[,\s]+/).filter(Boolean),
    emails,
  });

  async function lookupVat() {
    const afm = form.vatNumber.trim();
    if (!/^\d{9}$/.test(afm)) {
      setError("Εισάγετε 9-ψήφιο ΑΦΜ");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/vat-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα αναζήτησης");
        return;
      }

      setForm((prev) => ({
        ...prev,
        vatNumber: data.afm || prev.vatNumber,
        name: data.name || prev.name,
        legalName: data.legalName || prev.legalName,
        taxOffice: data.taxOffice || prev.taxOffice,
        addressLine1: data.addressLine1 || prev.addressLine1,
        postalCode: data.postalCode || prev.postalCode,
        city: data.city || prev.city,
        country: data.country || prev.country,
        // Η περιγραφή γεμίζει από τους ΚΑΔ μόνο αν είναι κενή — δεν σβήνουμε ό,τι έγραψε ο χρήστης.
        description: prev.description.trim() || (data.activities ?? []).join("\n"),
      }));

      setInfo(
        [data.name, data.legalStatus, data.isActive ? null : "⚠ ΑΝΕΝΕΡΓΟ ΑΦΜ"]
          .filter(Boolean)
          .join(" · ")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Σφάλμα δικτύου");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={action}>
      {gaps.length > 0 && <OrgGapsNotice gaps={gaps} className="mb-6" />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> Γενικά Στοιχεία
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Εμπορική Επωνυμία *">
              <Input name="name" value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="Νομική Επωνυμία">
              <Input name="legalName" value={form.legalName} onChange={set("legalName")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="ΑΦΜ">
              <div className="flex gap-1.5">
                <Input
                  name="vatNumber"
                  value={form.vatNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      vatNumber: e.target.value.replace(/\D/g, "").slice(0, 9),
                    }))
                  }
                  maxLength={9}
                  className="font-mono"
                  placeholder="9 ψηφία"
                />
                <button
                  type="button"
                  onClick={lookupVat}
                  disabled={loading || form.vatNumber.length !== 9}
                  title="Αναζήτηση στοιχείων από ΓΓΔΕ"
                  aria-label="Αναζήτηση στοιχείων από ΓΓΔΕ"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-40"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(0,120,212,0.08)",
                    color: "#0078d4",
                  }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MdSearch size={17} />}
                </button>
              </div>
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              {info && (
                <p className="text-[11px] font-medium" style={{ color: "#107c10" }}>
                  ✓ {info}
                </p>
              )}
            </Field>
            <Field label="ΔΟΥ">
              <Input name="taxOffice" value={form.taxOffice} onChange={set("taxOffice")} />
            </Field>
            <Field label="ΓΕΜΗ">
              <Input name="registryNo" value={form.registryNo} onChange={set("registryNo")} />
            </Field>
          </div>

          <Field label="Logo Εταιρείας">
            <LogoUploader currentLogo={logo} />
          </Field>

          <Field label="Περιγραφή / Δραστηριότητα">
            <Textarea name="description" value={form.description} onChange={set("description")} rows={3} />
          </Field>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Έδρα</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Διεύθυνση">
            <Input
              name="addressLine1"
              value={form.addressLine1}
              onChange={set("addressLine1")}
              placeholder="Οδός & Αριθμός"
            />
          </Field>
          <Field label="Διεύθυνση (2)">
            <Input name="addressLine2" value={form.addressLine2} onChange={set("addressLine2")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Πόλη">
              <Input name="city" value={form.city} onChange={set("city")} />
            </Field>
            <Field label="ΤΚ">
              <Input name="postalCode" value={form.postalCode} onChange={set("postalCode")} />
            </Field>
            <Field label="Χώρα">
              <Input name="country" value={form.country} onChange={set("country")} />
            </Field>
          </div>
          <Field label="Website">
            <Input name="website" value={form.website} onChange={set("website")} placeholder="https://..." />
          </Field>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Τηλέφωνα</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONTACT_ROWS.map((i) => (
            <div key={i} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3">
              <Input name="phoneLabel" defaultValue={phones[i]?.label ?? ""} placeholder="Ετικέτα" />
              <Input name="phone" defaultValue={phones[i]?.number ?? ""} placeholder="+30 ..." />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CONTACT_ROWS.map((i) => (
            <div key={i} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3">
              <Input name="emailLabel" defaultValue={emails[i]?.label ?? ""} placeholder="Ετικέτα" />
              <Input
                name="email"
                type="email"
                defaultValue={emails[i]?.address ?? ""}
                placeholder="name@dgsoft.gr"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Λίστα domains (διαχωρισμένα με κόμμα ή κενό)">
            <Textarea
              name="domains"
              value={form.domains}
              onChange={set("domains")}
              rows={2}
              placeholder="dgsoft.gr, dgsmart.gr"
            />
            <p className="text-[11px] text-muted-foreground">
              Χρησιμοποιούνται για να αναγνωρίζεται η εταιρία σας σε συμβάσεις και emails.
            </p>
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-6">
        <Button type="submit" className="gap-1.5">
          <Save className="h-4 w-4" /> Αποθήκευση
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}
