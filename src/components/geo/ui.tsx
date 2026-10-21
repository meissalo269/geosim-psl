import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AlertTriangle, Database, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeo, type Dataset } from "@/lib/store";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-card px-6 py-5">
      <div>
        <h1 className="text-2xl font-semibold text-primary">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-md border border-border bg-card ${className ?? ""}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="stat-num mt-1 text-2xl font-semibold text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyData({ message = "Aucun raster importé." }: { message?: string }) {
  const loadDemo = useGeo((s) => s.loadDemo);
  return (
    <div className="grid-paper flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border p-10 text-center">
      <Database className="h-8 w-8 text-sky" />
      <p className="font-medium text-primary">{message}</p>
      <p className="max-w-md text-sm text-muted-foreground">Importez vos cartes d'occupation du sol (GeoTIFF classifiés) pour obtenir des résultats calculés à partir de vos données.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild><Link to="/donnees">Importer des données</Link></Button>
        <Button variant="outline" onClick={loadDemo}><FlaskConical className="mr-1 h-4 w-4" />Jeu de démonstration (fictif)</Button>
      </div>
    </div>
  );
}

export function Notice({ tone = "warning", title, children }: { tone?: "warning" | "error" | "info"; title: string; children?: ReactNode }) {
  const cls = tone === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : tone === "info" ? "border-sky/40 bg-secondary text-secondary-foreground" : "border-warning/60 bg-warning/15 text-warning-foreground";
  return (
    <div className={`flex gap-3 rounded-md border p-3 text-sm ${cls}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div><div className="font-semibold">{title}</div>{children && <div className="mt-1 opacity-90">{children}</div>}</div>
    </div>
  );
}

export function DemoBadge() {
  return <span className="rounded-sm bg-warning px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-foreground">Fictif</span>;
}

export function useRasters() {
  const datasets = useGeo((s) => s.datasets);
  return datasets.filter((d): d is Dataset & { raster: NonNullable<Dataset["raster"]> } => !!d.raster);
}

export function RasterSelect({ value, onChange, label, rasters }: { value: string; onChange: (v: string) => void; label: string; rasters: Dataset[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Choisir —</option>
        {rasters.map((r) => (
          <option key={r.id} value={r.id}>{r.year ?? "année ?"} · {r.name}</option>
        ))}
      </select>
    </label>
  );
}

export const fmtHa = (x: number) => x.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
export const fmtPct = (x: number) => (x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
