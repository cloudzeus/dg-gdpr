"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Database, Cloud, Server, Monitor, Phone, Globe, Lock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Entity {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  zone?: string;
}

interface Zone {
  id: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  gdprNote: string;
}

const initialEntities: Entity[] = [
  { id: "voip", label: "VoIP Εγγραφές", icon: Phone, color: "text-purple-600", description: "Ηχογραφήσεις & μεταδεδομένα κλήσεων" },
  { id: "softone-db", label: "SoftOne DB", icon: Database, color: "text-blue-600", description: "ERP βάση δεδομένων πελάτη" },
  { id: "azure-logs", label: "Azure Logs", icon: Cloud, color: "text-sky-600", description: "Αρχεία καταγραφής Azure" },
  { id: "employee-data", label: "Δεδομένα Εργαζομένων", icon: Monitor, color: "text-green-600", description: "HR & μισθοδοσία" },
  { id: "customer-pii", label: "PII Πελατών", icon: Lock, color: "text-red-600", description: "Προσωπικά στοιχεία πελατών" },
  { id: "web-logs", label: "Web Logs", icon: Globe, color: "text-orange-600", description: "Αρχεία web server" },
  { id: "backup-storage", label: "Backup Storage", icon: Server, color: "text-gray-600", description: "Αντίγραφα ασφαλείας" },
];

const zones: Zone[] = [
  { id: "client", label: "Πελάτης", description: "Δεδομένα στην έδρα του πελάτη", color: "border-blue-400", bg: "bg-blue-50/50 dark:bg-blue-950/20", gdprNote: "Ο πελάτης παραμένει Υπεύθυνος Επεξεργασίας" },
  { id: "integrator", label: "Integrator (Εσείς)", description: "Δεδομένα υπό επεξεργασία από εσάς", color: "border-purple-400", bg: "bg-purple-50/50 dark:bg-purple-950/20", gdprNote: "Αποτελείτε Εκτελεστή Επεξεργασίας — DPA υποχρεωτική" },
  { id: "cloud", label: "Cloud Storage", description: "Δεδομένα σε cloud υποδομή", color: "border-sky-400", bg: "bg-sky-50/50 dark:bg-sky-950/20", gdprNote: "Ελέγξτε τη χώρα αποθήκευσης (SCCs για εκτός ΕΕ)" },
  { id: "third-party", label: "Τρίτοι Πάροχοι", description: "Δεδομένα σε τρίτες υπηρεσίες", color: "border-orange-400", bg: "bg-orange-50/50 dark:bg-orange-950/20", gdprNote: "Απαιτείται DPA + αξιολόγηση ασφάλειας" },
];

function DraggableEntity({ entity }: { entity: Entity }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: entity.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none",
        isDragging && "opacity-40"
      )}
    >
      <entity.icon className={cn("h-5 w-5 shrink-0", entity.color)} />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-none">{entity.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{entity.description}</p>
      </div>
    </div>
  );
}

function DroppableZone({ zone, entities }: { zone: Zone; entities: Entity[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-dashed p-4 min-h-40 transition-colors",
        zone.bg,
        zone.color,
        isOver && "ring-2 ring-primary/50 scale-[1.01]"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{zone.label}</h3>
          <p className="text-xs text-muted-foreground">{zone.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs bg-card/80 rounded-md px-2 py-1 border border-border max-w-44">
          <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
          <span className="text-muted-foreground leading-tight">{zone.gdprNote}</span>
        </div>
      </div>

      {entities.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 text-center py-4">Σύρετε οντότητες εδώ</p>
      ) : (
        <div className="space-y-2">
          {entities.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg bg-card/90 border border-border px-3 py-2">
              <e.icon className={cn("h-4 w-4 shrink-0", e.color)} />
              <span className="text-sm font-medium">{e.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DataMapper() {
  const [entities, setEntities] = useState<Entity[]>(initialEntities);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) {
      setEntities((prev) => prev.map((e) => e.id === active.id ? { ...e, zone: undefined } : e));
      return;
    }
    const zoneId = over.id as string;
    setEntities((prev) => prev.map((e) => e.id === active.id ? { ...e, zone: zoneId } : e));
  }, []);

  const unplaced = entities.filter((e) => !e.zone);
  const activeEntity = entities.find((e) => e.id === activeId);

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Zones grid */}
        <div className="grid grid-cols-2 gap-4">
          {zones.map((zone) => (
            <DroppableZone
              key={zone.id}
              zone={zone}
              entities={entities.filter((e) => e.zone === zone.id)}
            />
          ))}
        </div>

        {/* Entity palette */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Οντότητες Δεδομένων — Σύρετε σε Ζώνη
          </h3>
          {unplaced.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">Όλες οι οντότητες έχουν τοποθετηθεί</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {unplaced.map((entity) => (
                <DraggableEntity key={entity.id} entity={entity} />
              ))}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeEntity && (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-card p-3 shadow-xl cursor-grabbing">
              <activeEntity.icon className={cn("h-5 w-5", activeEntity.color)} />
              <span className="text-sm font-medium">{activeEntity.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEntities(initialEntities.map((e) => ({ ...e, zone: undefined })))}
        >
          Επαναφορά Χάρτη
        </Button>
      </div>
    </div>
  );
}
