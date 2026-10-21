import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Database, FileDown, GitCompareArrows, History, Home, LayoutDashboard, Map, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Sparkles, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/geosim-logo-contours.png";

const NAV = [
  { to: "/", label: "Accueil scientifique", icon: Home },
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/donnees", label: "Données géospatiales", icon: Database },
  { to: "/carte", label: "Explorateur cartographique", icon: Map },
  { to: "/analyse", label: "Analyse des changements", icon: GitCompareArrows },
  { to: "/simulation", label: "Simulation prospective", icon: Sparkles },
  { to: "/validation", label: "Classification et précision", icon: ShieldCheck },
  { to: "/rapports", label: "Rapport scientifique", icon: FileDown },
  { to: "/documentation", label: "Documentation", icon: BookOpen },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setDark(window.matchMedia("(prefers-color-scheme: dark)").matches); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return <div className="flex min-h-screen">
    <aside className={`fixed inset-y-0 left-0 z-[1000] flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 print:hidden ${collapsed ? "lg:w-16" : "lg:w-64"} ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="border-b border-sidebar-border p-3">
        <Link to="/" onClick={() => setOpen(false)} className={`block bg-logo-surface ${collapsed ? "lg:hidden" : ""}`}><img src={logo} width={1536} height={512} alt="GeoSim PSL" className="h-auto w-full" /></Link>
        <Button variant="ghost" size="icon" className="mt-2 hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:inline-flex" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Développer la navigation" : "Rétracter la navigation"} title={collapsed ? "Développer la navigation" : "Rétracter la navigation"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">{NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return <Link key={to} to={to} onClick={() => setOpen(false)} title={label} aria-label={label} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}><Icon className={`h-4 w-4 shrink-0 ${active ? "text-sidebar-primary" : ""}`} /><span className={collapsed ? "lg:hidden" : ""}>{label}</span></Link>;
      })}</nav>
      <div className="border-t border-sidebar-border p-3">
        <Button size="icon" variant="ghost" onClick={() => setDark(!dark)} aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"} title={dark ? "Mode clair" : "Mode sombre"} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
        <p className={`mt-2 text-[11px] leading-relaxed text-sidebar-foreground/70 ${collapsed ? "lg:hidden" : ""}`}>Cheikh Ahmed Fadel Keita et Meïssa Lo<br />Master 1 Géomatique et Modélisation spatiale<br />Aix-Marseille Université</p>
      </div>
    </aside>
    {open && <div className="fixed inset-0 z-[999] bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 text-sidebar-accent-foreground lg:hidden print:hidden"><Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Menu" className="text-sidebar-accent-foreground hover:bg-sidebar-accent">{open ? <X /> : <Menu />}</Button><span className="font-semibold">GeoSim PSL</span></div>
      <main className="flex-1">{children}</main>
    </div>
  </div>;
}
