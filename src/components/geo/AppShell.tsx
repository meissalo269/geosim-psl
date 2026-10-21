import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { BarChart3, Database, FileDown, GitCompareArrows, History, LayoutDashboard, Map, Menu, Settings, ShieldCheck, Sparkles, X } from "lucide-react";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/donnees", label: "Données géospatiales", icon: Database },
  { to: "/carte", label: "Visualiseur cartographique", icon: Map },
  { to: "/analyse", label: "Analyse diachronique", icon: GitCompareArrows },
  { to: "/simulation", label: "Simulation prospective", icon: Sparkles },
  { to: "/validation", label: "Validation scientifique", icon: ShieldCheck },
  { to: "/rapports", label: "Rapports et exports", icon: FileDown },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-[1000] w-64 bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sidebar-primary" />
            <span className="text-lg font-semibold text-sidebar-accent-foreground">GeoSim PSL</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-sidebar-foreground/70">Observatoire de l'occupation du sol et des dynamiques territoriales</p>
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}>
                <Icon className={`h-4 w-4 ${active ? "text-sidebar-primary" : ""}`} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/60">
          Master 1 Géomatique · Aix-Marseille Université · 2026–2027
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-[999] bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 text-sidebar-accent-foreground lg:hidden print:hidden">
          <button onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
          <span className="font-semibold">GeoSim PSL</span>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
