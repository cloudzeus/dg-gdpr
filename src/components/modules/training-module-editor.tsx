"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CommandBar, CommandBarButton } from "@/components/shared/command-bar";
import {
  updateModule,
  createSection, updateSection, deleteSection,
  createMaterial, deleteMaterial,
  createQuestion, updateQuestion, deleteQuestion,
} from "@/actions/training-admin";
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen, Save, FileText, Video, Link as LinkIcon, File, Music, Image as ImgIcon } from "lucide-react";

type Material = {
  id: string;
  type: string;
  title: string;
  url: string | null;
  content: string | null;
};

type Section = {
  id: string;
  title: string;
  body: string | null;
  order: number;
  materials: Material[];
};

type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
  weight: number;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  durationMin: number;
  targetRole: string | null;
  isActive: boolean;
};

const MATERIAL_TYPES = [
  { value: "PDF", label: "PDF", icon: FileText },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "AUDIO", label: "Audio", icon: Music },
  { value: "IMAGE", label: "Εικόνα", icon: ImgIcon },
  { value: "LINK", label: "Σύνδεσμος", icon: LinkIcon },
  { value: "DOCUMENT", label: "Έγγραφο", icon: File },
  { value: "SLIDE_DECK", label: "Παρουσίαση", icon: File },
  { value: "ARTICLE", label: "Άρθρο", icon: FileText },
];

const materialIcon = (type: string) => MATERIAL_TYPES.find((m) => m.value === type)?.icon ?? File;

export function TrainingModuleEditor({
  moduleData,
  sections,
  questions,
}: {
  moduleData: Module;
  sections: Section[];
  questions: Question[];
}) {
  const [tab, setTab] = useState<"meta" | "sections" | "questions">("sections");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [creatingMaterialFor, setCreatingMaterialFor] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e: any) {
        setError(e.message ?? "Σφάλμα");
      }
    });
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/training" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Πίσω στη λίστα
      </Link>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <TabBtn active={tab === "sections"} onClick={() => setTab("sections")}>Ενότητες ({sections.length})</TabBtn>
        <TabBtn active={tab === "questions"} onClick={() => setTab("questions")}>Ερωτήσεις Τεστ ({questions.length})</TabBtn>
        <TabBtn active={tab === "meta"} onClick={() => setTab("meta")}>Ρυθμίσεις</TabBtn>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* META TAB */}
      {tab === "meta" && (
        <Card>
          <CardContent className="p-6">
            <form action={(fd) => run(() => updateModule(moduleData.id, fd))} className="space-y-4">
              <Field label="Τίτλος"><Input name="title" defaultValue={moduleData.title} required /></Field>
              <Field label="Περιγραφή">
                <textarea name="description" defaultValue={moduleData.description ?? ""} rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Διάρκεια (min)"><Input name="durationMin" type="number" defaultValue={moduleData.durationMin} /></Field>
                <Field label="Ελάχ. Βαθμός (%)"><Input name="passingScore" type="number" defaultValue={moduleData.passingScore} /></Field>
                <Field label="Target Ρόλος">
                  <select name="targetRole" defaultValue={moduleData.targetRole ?? ""} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Όλοι</option>
                    <option value="ADMIN">Admin</option>
                    <option value="DPO">DPO</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="USER">User</option>
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={moduleData.isActive} /> Ενεργή
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Αποθήκευση</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* SECTIONS TAB */}
      {tab === "sections" && (
        <>
          <CommandBar>
            <CommandBarButton icon={Plus} label="Νέα Ενότητα" variant="primary" onClick={() => setCreatingSection(true)} />
          </CommandBar>
          <div className="space-y-3">
            {sections.map((s, i) => (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground text-sm">#{i + 1}</span> {s.title}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm(`Διαγραφή ενότητας "${s.title}";`)) run(() => deleteSection(s.id));
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {s.body && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{s.body}</p>}
                  <div className="space-y-1.5">
                    {s.materials.map((m) => {
                      const Icon = materialIcon(m.type);
                      return (
                        <div key={m.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <Badge variant="secondary" className="text-[10px]">{m.type}</Badge>
                          <span className="flex-1 truncate">{m.title}</span>
                          {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Άνοιγμα</a>}
                          <Button variant="ghost" size="sm" onClick={() => run(() => deleteMaterial(m.id))}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" onClick={() => setCreatingMaterialFor(s.id)} className="gap-1 text-xs">
                      <Plus className="h-3 w-3" /> Προσθήκη Υλικού (PDF / Video / Link)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sections.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Δεν υπάρχουν ενότητες — προσθέστε πρώτη</p>
            )}
          </div>
        </>
      )}

      {/* QUESTIONS TAB */}
      {tab === "questions" && (
        <>
          <CommandBar>
            <CommandBarButton icon={Plus} label="Νέα Ερώτηση" variant="primary" onClick={() => setCreatingQuestion(true)} />
          </CommandBar>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary">Βαρύτητα ×{q.weight}</Badge>
                        <span>{q.options.length} επιλογές</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, idx) => (
                          <li key={idx} className={`text-xs flex items-center gap-2 ${idx === q.correctAnswer ? "text-green-700 font-semibold" : "text-muted-foreground"}`}>
                            {idx === q.correctAnswer ? "✓" : "·"} {opt}
                          </li>
                        ))}
                      </ul>
                      {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm("Διαγραφή ερώτησης;")) run(() => deleteQuestion(q.id));
                      }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {questions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Δεν υπάρχουν ερωτήσεις — το τεστ χρειάζεται τουλάχιστον μία</p>
            )}
          </div>
        </>
      )}

      {/* Section modal */}
      <Modal
        open={creatingSection || editingSection !== null}
        onClose={() => { setCreatingSection(false); setEditingSection(null); }}
        title={editingSection ? "Επεξεργασία Ενότητας" : "Νέα Ενότητα"}
      >
        <form
          action={(fd) => {
            if (editingSection) run(() => updateSection(editingSection.id, fd).then(() => { setEditingSection(null); }));
            else run(() => createSection(moduleData.id, fd).then(() => { setCreatingSection(false); }));
          }}
          className="space-y-3"
        >
          <Field label="Τίτλος *"><Input name="title" defaultValue={editingSection?.title ?? ""} required autoFocus /></Field>
          <Field label="Περιεχόμενο">
            <textarea name="body" defaultValue={editingSection?.body ?? ""} rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setCreatingSection(false); setEditingSection(null); }}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending}>Αποθήκευση</Button>
          </div>
        </form>
      </Modal>

      {/* Material modal */}
      <Modal
        open={creatingMaterialFor !== null}
        onClose={() => setCreatingMaterialFor(null)}
        title="Νέο Εκπαιδευτικό Υλικό"
      >
        <form
          action={(fd) => {
            if (!creatingMaterialFor) return;
            run(() => createMaterial(creatingMaterialFor, fd).then(() => setCreatingMaterialFor(null)));
          }}
          className="space-y-3"
        >
          <Field label="Τίτλος *"><Input name="title" required autoFocus /></Field>
          <Field label="Τύπος *">
            <select name="type" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" defaultValue="PDF">
              {MATERIAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="URL (για PDF/Video/Link)">
            <Input name="url" placeholder="https://..." />
          </Field>
          <Field label="MIME Type (προαιρετικό)">
            <Input name="mimeType" placeholder="application/pdf" />
          </Field>
          <Field label="Εσωτερικό κείμενο (προαιρετικό αν δεν υπάρχει URL)">
            <textarea name="content" rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreatingMaterialFor(null)}>Ακύρωση</Button>
            <Button type="submit" disabled={isPending}>Προσθήκη</Button>
          </div>
        </form>
      </Modal>

      {/* Question modal */}
      <Modal
        open={creatingQuestion || editingQuestion !== null}
        onClose={() => { setCreatingQuestion(false); setEditingQuestion(null); }}
        title={editingQuestion ? "Επεξεργασία Ερώτησης" : "Νέα Ερώτηση"}
      >
        <QuestionForm
          initial={editingQuestion}
          disabled={isPending}
          onSubmit={(fd) => {
            if (editingQuestion) run(() => updateQuestion(editingQuestion.id, fd).then(() => setEditingQuestion(null)));
            else run(() => createQuestion(moduleData.id, fd).then(() => setCreatingQuestion(false)));
          }}
          onCancel={() => { setCreatingQuestion(false); setEditingQuestion(null); }}
        />
      </Modal>
    </div>
  );
}

function QuestionForm({
  initial, onSubmit, onCancel, disabled,
}: {
  initial: Question | null;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<string[]>(initial?.options ?? ["", ""]);
  const [correct, setCorrect] = useState<number>(initial?.correctAnswer ?? 0);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    if (correct >= next.length) setCorrect(Math.max(0, next.length - 1));
  };
  const setOption = (i: number, v: string) => setOptions(options.map((o, idx) => (idx === i ? v : o)));

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Ερώτηση *">
        <textarea name="question" defaultValue={initial?.question ?? ""} required rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      </Field>
      <Field label="Επιλογές (επιλέξτε τη σωστή)">
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correctAnswer" value={i} checked={correct === i} onChange={() => setCorrect(i)} />
              <Input name="option" value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Επιλογή ${i + 1}`} />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1"><Plus className="h-3 w-3" /> Επιλογή</Button>
        </div>
      </Field>
      <Field label="Επεξήγηση (εμφανίζεται μετά την απάντηση)">
        <textarea name="explanation" defaultValue={initial?.explanation ?? ""} rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      </Field>
      <Field label="Βαρύτητα">
        <select name="weight" defaultValue={initial?.weight ?? 1} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="1">×1 (κανονική)</option>
          <option value="2">×2 (σημαντική)</option>
          <option value="3">×3 (κρίσιμη)</option>
        </select>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Ακύρωση</Button>
        <Button type="submit" disabled={disabled}>Αποθήκευση</Button>
      </div>
    </form>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
