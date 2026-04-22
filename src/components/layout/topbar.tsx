"use client";

import { Bell, Moon, Sun, LogOut, HelpCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "@/hooks/use-theme";

interface TopbarProps {
  userName?: string | null;
  userRole?: string | null;
  pageTitle: string;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Διαχειριστής",
  DPO: "Υπεύθυνος Προστασίας",
  SECURITY_OFFICER: "Υπεύθυνος Ασφαλείας",
  COMPLIANCE_OFFICER: "Υπεύθυνος Συμμόρφωσης",
  IT_MANAGER: "IT Manager",
  HR_MANAGER: "HR Manager",
  DEVELOPER: "Προγραμματιστής",
  USER: "Χρήστης",
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Deterministic color from name — picks from MS-brand palette */
const avatarColors = [
  "#0078d4", "#106ebe", "#2b88d8",
  "#107c10", "#217346", "#008575",
  "#c239b3", "#7719aa", "#ca5010",
  "#d13438",
];

function getAvatarColor(name?: string | null) {
  if (!name) return avatarColors[0];
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[code % avatarColors.length];
}

export function Topbar({ userName, userRole, pageTitle }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const initials = getInitials(userName);
  const avatarBg = getAvatarColor(userName);

  return (
    <header
      className="flex h-12 items-center justify-between px-4 shrink-0"
      style={{
        background: "rgb(var(--card))",
        borderBottom: "1px solid rgb(var(--border))",
        boxShadow: "0 1px 2px 0 rgba(0,0,0,0.06)",
      }}
    >
      {/* Left: page title */}
      <div className="flex items-center gap-2 min-w-0">
        <h1
          className="text-[15px] font-semibold truncate"
          style={{ color: "rgb(var(--foreground))" }}
        >
          {pageTitle}
        </h1>
      </div>

      {/* Right: command bar actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded transition-colors"
          title={theme === "dark" ? "Φωτεινό θέμα" : "Σκοτεινό θέμα"}
          style={{ color: "rgb(var(--muted-foreground))" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgb(var(--secondary))")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded transition-colors"
          title="Ειδοποιήσεις"
          style={{ color: "rgb(var(--muted-foreground))" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgb(var(--secondary))")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div
          className="mx-1.5 h-5"
          style={{ width: "1px", background: "rgb(var(--border))" }}
        />

        {/* User persona */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white select-none shrink-0"
            style={{ background: avatarBg }}
            title={userName ?? "Χρήστης"}
          >
            {initials}
          </div>

          {/* Name + role */}
          <div className="hidden sm:block leading-none">
            <p
              className="text-[13px] font-semibold"
              style={{ color: "rgb(var(--foreground))" }}
            >
              {userName ?? "Χρήστης"}
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "rgb(var(--muted-foreground))" }}
            >
              {roleLabel[userRole ?? "USER"] ?? "Χρήστης"}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-8 w-8 items-center justify-center rounded transition-colors ml-0.5"
            title="Αποσύνδεση"
            style={{ color: "rgb(var(--muted-foreground))" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(164,38,44,0.08)";
              (e.currentTarget as HTMLElement).style.color = "rgb(164,38,44)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color =
                "rgb(var(--muted-foreground))";
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
