"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MdDashboard, MdCode, MdPhone, MdHub, MdDescription, MdSchool,
  MdBarChart, MdArticle, MdSettings, MdSecurity, MdFactCheck,
  MdPersonOff, MdVerifiedUser, MdBusiness, MdWork, MdGroup,
  MdLibraryBooks, MdHandshake, MdDeviceHub, MdMenu, MdClose,
  MdChevronLeft, MdChevronRight, MdExpandMore, MdExpandLess,
  MdVpnKey, MdAssignment,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string; size?: number; style?: any }> };
type NavGroup = { id: string; label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    id: "compliance",
    label: "Συμμόρφωση",
    items: [
      { label: "Πίνακας Ελέγχου", href: "/dashboard", icon: MdDashboard },
      { label: "Αξιολόγηση GDPR", href: "/assessment", icon: MdFactCheck },
      { label: "DPIA & DPA", href: "/dpia", icon: MdDescription },
      { label: "Δικαίωμα Λήθης", href: "/erasure", icon: MdPersonOff },
      { label: "Ροές Δεδομένων", href: "/mapper", icon: MdHub },
      { label: "Αναφορές", href: "/reports", icon: MdBarChart },
    ],
  },
  {
    id: "operations",
    label: "Λειτουργίες",
    items: [
      { label: "Ανάπτυξη Λογισμικού", href: "/dev", icon: MdCode },
      { label: "VoIP & Τηλεφωνία", href: "/voip", icon: MdPhone },
      { label: "Εκπαίδευση", href: "/training", icon: MdSchool },
      { label: "Αρχείο Ελέγχου", href: "/audit", icon: MdArticle },
    ],
  },
  {
    id: "admin",
    label: "Διαχείριση",
    items: [
      { label: "Εταιρεία", href: "/admin/company", icon: MdBusiness },
      { label: "Πελάτες & Προμηθευτές", href: "/admin/companies", icon: MdHandshake },
      { label: "Τμήματα", href: "/admin/departments", icon: MdDeviceHub },
      { label: "Θέσεις Εργασίας", href: "/admin/positions", icon: MdWork },
      { label: "Χρήστες", href: "/admin/users", icon: MdGroup },
      { label: "Πολιτικές & Έγγραφα", href: "/admin/policies", icon: MdLibraryBooks },
      { label: "Αιτήματα GDPR (DSR)", href: "/admin/dsr", icon: MdAssignment },
      { label: "API Κλειδιά", href: "/admin/api-keys", icon: MdVpnKey },
      { label: "Εκπαίδευση (Admin)", href: "/admin/training", icon: MdSchool },
      { label: "Ρόλοι & Πρόσβαση", href: "/admin/roles", icon: MdVerifiedUser },
      { label: "Ρυθμίσεις", href: "/settings", icon: MdSettings },
    ],
  },
];

function NavContent({ collapsed, onLinkClick }: { collapsed: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();
  // Default: compliance & operations open, admin collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    compliance: true,
    operations: true,
    admin: false,
  });

  // Auto-expand group that contains current path
  useEffect(() => {
    for (const g of navGroups) {
      if (g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        setExpanded((prev) => ({ ...prev, [g.id]: true }));
        break;
      }
    }
  }, [pathname]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex h-12 items-center gap-2.5 px-3 shrink-0" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded" style={{ background: "rgb(0,120,212)" }}>
          <MdSecurity size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <p className="truncate text-[13px] font-semibold leading-none" style={{ color: "rgb(var(--foreground))" }}>
              GDPR Compliance OS
            </p>
            <p className="truncate text-[11px] mt-0.5" style={{ color: "rgb(var(--muted-foreground))" }}>DG Smart</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group, gi) => {
          const isOpen = collapsed || expanded[group.id];
          const hasActive = group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <div key={group.id} className={cn(gi > 0 && "mt-1")}>
              {/* Group header — collapsible */}
              {!collapsed ? (
                <button
                  onClick={() => toggle(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 transition-colors select-none"
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5"
                    style={{ color: hasActive && !isOpen ? "rgb(0,120,212)" : "rgb(var(--muted-foreground))" }}>
                    {hasActive && !isOpen && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "rgb(0,120,212)" }} />
                    )}
                    {group.label}
                  </span>
                  {isOpen
                    ? <MdExpandLess size={14} style={{ color: "rgb(var(--muted-foreground))", flexShrink: 0 }} />
                    : <MdExpandMore size={14} style={{ color: "rgb(var(--muted-foreground))", flexShrink: 0 }} />
                  }
                </button>
              ) : (
                gi > 0 && <div className="mx-2 my-1.5" style={{ height: "1px", background: "rgb(var(--border))" }} />
              )}

              {/* Items */}
              {isOpen && (
                <ul className="space-y-px px-2">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href} className="relative">
                        {active && (
                          <span className="absolute left-0 top-0 bottom-0 rounded-r-sm" style={{ width: 3, background: "rgb(0,120,212)" }} />
                        )}
                        <Link
                          href={item.href}
                          onClick={onLinkClick}
                          className={cn("flex items-center gap-2.5 rounded px-2.5 py-1.5 text-[13px] transition-colors duration-100 w-full", active ? "font-medium" : "font-normal")}
                          style={{
                            color: active ? "rgb(0,120,212)" : "rgb(var(--sidebar-foreground))",
                            background: active ? "rgba(0,120,212,0.08)" : undefined,
                            paddingLeft: active ? 14 : undefined,
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgb(var(--sidebar-muted))"; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon
                            size={17}
                            className="shrink-0"
                            style={{ color: active ? "rgb(0,120,212)" : "rgb(var(--muted-foreground))" }}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-2 shrink-0" style={{ borderTop: "1px solid rgb(var(--border))", color: "rgb(var(--muted-foreground))" }}>
          <p className="text-[10px]">v1.0 · GDPR Article 5</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 flex h-8 w-8 items-center justify-center rounded border transition-colors md:hidden"
        style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--foreground))" }}
        onClick={() => setMobileOpen(true)}
      >
        <MdMenu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn("fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r transition-transform duration-200 md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}
        style={{ background: "rgb(var(--sidebar))", borderColor: "rgb(var(--border))" }}
      >
        <button className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded transition-colors"
          style={{ color: "rgb(var(--muted-foreground))" }} onClick={() => setMobileOpen(false)}>
          <MdClose size={18} />
        </button>
        <NavContent collapsed={false} onLinkClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn("relative hidden md:flex flex-col border-r transition-all duration-200 shrink-0", collapsed ? "w-14" : "w-[220px]")}
        style={{ background: "rgb(var(--sidebar))", borderColor: "rgb(var(--border))" }}
      >
        <NavContent collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors"
          style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--muted-foreground))" }}
        >
          {collapsed ? <MdChevronRight size={14} /> : <MdChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}
