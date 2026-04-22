import { formatDateTime } from "@/lib/utils";

interface Log {
  id: string;
  action: string;
  entity: string;
  createdAt: Date;
  user: { name: string | null; email: string | null };
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
};

export function RecentAuditLog({ logs }: { logs: Log[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν εγγραφές</p>;
  }

  return (
    <ul className="space-y-2.5">
      {logs.map((log) => (
        <li key={log.id} className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${actionColors[log.action] ?? "bg-secondary text-secondary-foreground"}`}
          >
            {log.action}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{log.entity}</p>
            <p className="text-xs text-muted-foreground">
              {log.user.name ?? log.user.email} · {formatDateTime(log.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
