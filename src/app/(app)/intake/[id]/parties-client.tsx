"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Loader2, Trash2, AlertTriangle, Users } from "lucide-react";
import { setPartyRole } from "@/actions/intake";
import { addPartyManually, removeParty, setVendorTriage } from "@/actions/intake-ui";
import type { getIntakeDetail } from "@/actions/intake-ui";
import type { listCompanies } from "@/actions/companies";
import type { Extraction } from "@/lib/intake/schemas";
import type { PartyRoleValue } from "@/lib/intake/role-mapping";
import type { PartySideValue } from "@/lib/intake/company-match";

type Intake = Awaited<ReturnType<typeof getIntakeDetail>>["intake"];
type Party = Intake["parties"][number];
type Company = Awaited<ReturnType<typeof listCompanies>>[number];
type Vendor = Extraction["vendors"][number];
type Triage = Vendor["triage"];

const SIDE_OPTIONS: { value: PartySideValue; label: string }[] = [
  { value: "OWN_MOTHER", label: "Δική μας — μητρική" },
  { value: "OWN_GROUP", label: "Δική μας — θυγατρική" },
  { value: "EXTERNAL", label: "Αντισυμβαλλόμενος" },
];

const ROLE_OPTIONS: { value: PartyRoleValue; label: string }[] = [
  { value: "CONTROLLER", label: "Υπεύθυνος Επεξεργασίας" },
  { value: "PROCESSOR", label: "Εκτελών την Επεξεργασία" },
  { value: "JOINT_CONTROLLER", label: "Από Κοινού Υπεύθυνος" },
  { value: "SUB_PROCESSOR", label: "Υποεκτελών" },
  { value: "RECIPIENT", label: "Αποδέκτης" },
  { value: "THIRD_PARTY", label: "Τρίτος" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));

const MATCH_METHOD_LABEL: Record<string, string> = {
  VAT: "ταίριαξε με ΑΦΜ",
  NAME: "ταίριαξε με όνομα",
  MANUAL: "προστέθηκε χειροκίνητα",
  NONE: "δεν ταίριαξε",
};

const TRIAGE_COLUMNS: { value: Triage; label: string; color: string }[] = [
  { value: "PROCESSES_DATA", label: "Επεξεργάζεται δεδομένα", color: "#a4262c" },
  { value: "SUPPLIES_ONLY", label: "Απλώς προμηθεύει", color: "#107c10" },
  { value: "UNCLEAR", label: "Ασαφές", color: "#ca5d00" },
];

export function PartiesClient({
  intake,
  extraction,
  companies,
  subsidiaries,
  recipientMatchId,
  orgName,
  motherMatchId,
  motherMatchName,
}: {
  intake: Intake;
  extraction: Extraction;
  companies: Company[];
  subsidiaries: Company[];
  recipientMatchId: string | null;
  orgName: string | null;
  motherMatchId: string | null;
  motherMatchName: string | null;
}) {
  const hasExternal = intake.parties.some((p) => p.side === "EXTERNAL");
  const hasOwn = intake.parties.some((p) => p.side !== "EXTERNAL");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" /> Μέρη & Ρόλοι
        </CardTitle>
        <CardDescription>
          Εδώ αγκυρώνεις ποιος είναι ποιος — τα έγγραφα προτείνουν, ο άνθρωπος επιβεβαιώνει.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Α. Τα μέρη */}
        <section className="space-y-2.5">
          {intake.parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Δεν εντοπίστηκαν συμβαλλόμενα μέρη στα έγγραφα — φυσιολογικό για προσφορές, που
              περιγράφουν το αντικείμενο αλλά δεν θεμελιώνουν μέρη. Δεν πρόκειται για σφάλμα ανάγνωσης.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {intake.parties.map((p) => (
                <PartyRow key={p.id} party={p} />
              ))}
            </ul>
          )}
        </section>

        {/* Β. Η αγκύρωση, όταν λείπει */}
        {(!hasExternal || !hasOwn) && (
          <section className="space-y-3">
            {!hasExternal && (
              <AnchorPanel
                intakeId={intake.id}
                companies={companies}
                heading="Δεν εντοπίστηκε αντισυμβαλλόμενος"
                description={
                  extraction.recipientHint ? (
                    <>
                      Οι προσφορές δεν θεμελιώνουν συμβαλλόμενα μέρη. Ο αποδέκτης φαίνεται να είναι
                      «{extraction.recipientHint}». Είναι αυτός ο πελάτης;
                    </>
                  ) : (
                    <>Οι προσφορές δεν θεμελιώνουν συμβαλλόμενα μέρη — επίλεξε τον αντισυμβαλλόμενο από τη βάση.</>
                  )
                }
                sideMode="fixed"
                fixedSide="EXTERNAL"
                defaultCompanyId={recipientMatchId}
                submitLabel="Προσθήκη ως αντισυμβαλλόμενος"
              />
            )}

            {!hasOwn &&
              (motherMatchId ? (
                <AnchorPanel
                  intakeId={intake.id}
                  companies={companies}
                  heading="Δεν εντοπίστηκε δική μας εταιρία"
                  description={
                    <>
                      Καμία δική μας εταιρία δεν εντοπίστηκε στη σύμβαση. Ο οργανισμός «{orgName}» φαίνεται
                      να αντιστοιχεί στην εταιρία «{motherMatchName}» της βάσης — είναι αυτή η δική μας
                      εταιρία;
                    </>
                  }
                  sideMode="choice"
                  defaultCompanyId={motherMatchId}
                  defaultSide="OWN_MOTHER"
                  submitLabel="Προσθήκη ως δική μας εταιρία"
                />
              ) : (
                <div
                  className="rounded-sm p-4 space-y-3"
                  style={{ background: "rgba(202,93,0,0.06)", border: "1px solid rgba(202,93,0,0.25)" }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#ca5d00" }} />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold" style={{ color: "#8a4500" }}>
                        Δεν εντοπίστηκε δική μας εταιρία
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ο οργανισμός{orgName ? ` «${orgName}»` : ""} δεν αντιστοιχεί σε καμία εταιρία της
                        βάσης — η αυτόματη αντιστοίχιση χρειάζεται σωστό ΑΦΜ.{" "}
                        <Link href="/admin/company" className="underline">
                          Συμπλήρωσε το ΑΦΜ του οργανισμού.
                        </Link>
                      </p>
                    </div>
                  </div>

                  {subsidiaries.length > 0 && (
                    <AnchorPanel
                      intakeId={intake.id}
                      companies={subsidiaries}
                      heading=""
                      description={<>Ή, αν κάποια θυγατρική του ομίλου υπογράφει αυτή τη σύμβαση, επίλεξέ την:</>}
                      sideMode="fixed"
                      fixedSide="OWN_GROUP"
                      defaultCompanyId={null}
                      submitLabel="Προσθήκη ως θυγατρική εταιρία"
                      bare
                    />
                  )}
                </div>
              ))}
          </section>
        )}

        {/* Γ. Οι προμηθευτές */}
        <section className="space-y-2.5 pt-2 border-t border-border">
          <div>
            <h4 className="text-sm font-semibold">Προμηθευτές</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Οι προμηθευτές δεν είναι συμβαλλόμενοι. Όσοι επεξεργάζονται δεδομένα για λογαριασμό μας
              χρειάζονται σύμβαση· όσοι απλώς προμηθεύουν εξοπλισμό όχι.
            </p>
          </div>
          <VendorsSection intakeId={intake.id} vendors={extraction.vendors} />
        </section>
      </CardContent>
    </Card>
  );
}

function PartyRow({ party }: { party: Party }) {
  const [role, setRole] = useState<PartyRoleValue | "">((party.confirmedRole as PartyRoleValue | null) ?? "");
  const [side, setSide] = useState<PartySideValue>(party.side as PartySideValue);
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function commit(nextRole: PartyRoleValue | "", nextSide: PartySideValue) {
    if (!nextRole) return; // χωρίς επιλεγμένο ρόλο δεν στέλνουμε τίποτα στον server
    startTransition(() => {
      setPartyRole(party.id, nextRole, nextSide);
    });
  }

  const articles = Array.isArray(party.gdprArticles) ? (party.gdprArticles as string[]) : [];
  const matchLabel = MATCH_METHOD_LABEL[party.matchMethod] ?? party.matchMethod;
  const showCompanyName = party.company && party.company.name !== party.extractedName;

  return (
    <li className="rounded-sm border border-border p-3 space-y-2.5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{party.extractedName}</p>
          <p className="text-xs text-muted-foreground">
            {party.extractedVat ? `ΑΦΜ ${party.extractedVat}` : "χωρίς ΑΦΜ"} · {matchLabel}
            {party.matchScore != null && ` (${party.matchScore.toFixed(2)})`}
            {showCompanyName && ` · βάση: ${party.company!.name}`}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={deleting}
          onClick={() => startDeleting(() => removeParty(party.id))}
          title="Διαγραφή μέρους"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-auto min-w-[190px]"
          value={side}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value as PartySideValue;
            setSide(v);
            commit(role, v);
          }}
        >
          {SIDE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-[200px]"
          value={role}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value as PartyRoleValue | "";
            setRole(v);
            commit(v, side);
          }}
        >
          <option value="">— επέλεξε ρόλο —</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {party.proposedRole && party.confirmedRole !== party.proposedRole && (
        <p className="text-[11px] text-muted-foreground">
          Το σύστημα πρότεινε: <strong>{ROLE_LABEL[party.proposedRole] ?? party.proposedRole}</strong>
        </p>
      )}

      {party.roleRationale && <p className="text-xs text-muted-foreground italic">{party.roleRationale}</p>}

      {articles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {articles.map((a) => (
            <Badge key={a} variant="outline">
              {a}
            </Badge>
          ))}
        </div>
      )}
    </li>
  );
}

function AnchorPanel({
  intakeId,
  companies,
  heading,
  description,
  sideMode,
  fixedSide,
  defaultCompanyId,
  defaultSide,
  submitLabel,
  bare,
}: {
  intakeId: string;
  companies: Company[];
  heading: string;
  description: ReactNode;
  sideMode: "fixed" | "choice";
  fixedSide?: PartySideValue;
  defaultCompanyId: string | null;
  defaultSide?: PartySideValue;
  submitLabel: string;
  bare?: boolean;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");
  const [side, setSide] = useState<PartySideValue>(fixedSide ?? defaultSide ?? "EXTERNAL");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit() {
    if (!companyId) return;
    setError(null);
    startTransition(async () => {
      try {
        await addPartyManually(intakeId, companyId, side);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Σφάλμα");
      }
    });
  }

  if (done) return null;

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-auto min-w-[220px]"
          value={companyId}
          disabled={pending}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          <option value="">— επίλεξε εταιρία —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.vatNumber ? ` (ΑΦΜ ${c.vatNumber})` : ""}
            </option>
          ))}
        </Select>

        {sideMode === "choice" && (
          <Select
            className="w-auto"
            value={side}
            disabled={pending}
            onChange={(e) => setSide(e.target.value as PartySideValue)}
          >
            <option value="OWN_MOTHER">Μητρική</option>
            <option value="OWN_GROUP">Θυγατρική</option>
          </Select>
        )}

        <Button type="button" size="sm" onClick={submit} disabled={pending || !companyId} className="gap-1.5">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!bare && (
        <p className="text-xs text-muted-foreground">
          Δεν βρίσκεις την εταιρία;{" "}
          <Link href="/admin/companies" className="underline">
            Πρόσθεσέ τη εδώ.
          </Link>
        </p>
      )}
    </>
  );

  if (bare) {
    return <div className="space-y-2 pt-1">{description && <p className="text-sm text-muted-foreground">{description}</p>}{body}</div>;
  }

  return (
    <div className="rounded-sm p-4 space-y-3" style={{ background: "rgba(202,93,0,0.06)", border: "1px solid rgba(202,93,0,0.25)" }}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#ca5d00" }} />
        <div className="space-y-1">
          {heading && (
            <p className="text-sm font-semibold" style={{ color: "#8a4500" }}>
              {heading}
            </p>
          )}
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      {body}
    </div>
  );
}

function VendorsSection({ intakeId, vendors }: { intakeId: string; vendors: Vendor[] }) {
  if (vendors.length === 0) {
    return <p className="text-sm text-muted-foreground">Δεν εντοπίστηκαν εμπορικά ονόματα προμηθευτών στα έγγραφα.</p>;
  }

  const groups: Record<Triage, Vendor[]> = {
    PROCESSES_DATA: vendors.filter((v) => v.triage === "PROCESSES_DATA"),
    SUPPLIES_ONLY: vendors.filter((v) => v.triage === "SUPPLIES_ONLY"),
    UNCLEAR: vendors.filter((v) => v.triage === "UNCLEAR"),
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TRIAGE_COLUMNS.map((col) => (
        <div key={col.value} className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: col.color }}>
            {col.label} ({groups[col.value].length})
          </p>
          <ul className="space-y-2">
            {groups[col.value].length === 0 && <li className="text-xs text-muted-foreground">—</li>}
            {groups[col.value].map((v) => (
              <VendorCard key={v.name} intakeId={intakeId} vendor={v} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function VendorCard({ intakeId, vendor }: { intakeId: string; vendor: Vendor }) {
  const [triage, setTriage] = useState<Triage>(vendor.triage);
  const [pending, startTransition] = useTransition();

  return (
    <li className="rounded-sm border border-border p-2.5 space-y-1.5 text-sm">
      <p className="font-medium">{vendor.name}</p>
      {vendor.evidence && <p className="text-[11px] text-muted-foreground italic">«{vendor.evidence}»</p>}
      <Select
        className="w-auto"
        value={triage}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value as Triage;
          setTriage(v);
          startTransition(() => {
            setVendorTriage(intakeId, vendor.name, v);
          });
        }}
      >
        <option value="PROCESSES_DATA">Επεξεργάζεται δεδομένα</option>
        <option value="SUPPLIES_ONLY">Απλώς προμηθεύει</option>
        <option value="UNCLEAR">Ασαφές</option>
      </Select>
      {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </li>
  );
}
