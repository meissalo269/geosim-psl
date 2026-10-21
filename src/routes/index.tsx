import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MapView, type OverlayLayer } from "@/components/geo/MapView";
import { DemoBadge, EmptyData, PageHeader, Panel, Stat, fmtHa, useRasters } from "@/components/geo/ui";
import { classAreas } from "@/lib/analysis";
import { renderToDataUrl, wgs84Bounds } from "@/lib/raster";
import { useClassColor } from "@/lib/geo-hooks";
import { useGeo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GeoSim PSL" },
      { name: "description", content: "Observatoire de l'occupation du sol de Port-Saint-Louis-du-Rhône : rasters, surfaces par classe et simulations." },
      { property: "og:title", content: "Tableau de bord — GeoSim PSL" },
      { property: "og:description", content: "Analyse diachronique et simulation prospective de l'occupation du sol à Port-Saint-Louis-du-Rhône." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const rasters = useRasters();
  const { classes, history } = useGeo();
  const colorOf = useClassColor();
  const years = [...new Set(rasters.map((r) => r.year).filter(Boolean))].sort() as number[];
  const anyDemo = rasters.some((r) => r.demo);

  const chart = useMemo(() => {
    const byYear = new Map<number, Record<string, number | string>>();
    rasters.filter((r) => r.year).forEach((r) => {
      const a = classAreas(r.raster);
      const row: Record<string, number | string> = { annee: String(r.year) };
      classes.forEach((c) => (row[c.name] = Math.round((a.get(c.code) ?? 0) * 10) / 10));
      byYear.set(r.year!, row);
    });
    return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  }, [rasters, classes]);

  const latest = rasters.filter((r) => r.year).sort((a, b) => b.year! - a.year!)[0];
  const overlays: OverlayLayer[] = useMemo(() => {
    if (!latest || typeof document === "undefined") return [];
    const b = wgs84Bounds(latest.raster);
    return b ? [{ id: latest.id, url: renderToDataUrl(latest.raster, colorOf), bounds: b, opacity: 0.75, visible: true }] : [];
  }, [latest, colorOf]);
  const studyArea = useGeo((s) => s.datasets.find((d) => d.isStudyArea && d.geojson));
  const lastJob = history.find((h) => h.type !== "Import");
  const sims = history.filter((h) => h.type === "Simulation Markov").slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Analyse diachronique de l'occupation du sol et simulation prospective — Port-Saint-Louis-du-Rhône (13)"
        actions={<>
          <Button asChild variant="outline"><Link to="/donnees">Importer des données</Link></Button>
          <Button asChild variant="outline"><Link to="/carte">Comparer les années</Link></Button>
          <Button asChild variant="outline"><Link to="/analyse">Analyser les changements</Link></Button>
          <Button asChild><Link to="/simulation">Lancer une simulation</Link></Button>
        </>}
      />
      <div className="space-y-6 p-6">
        {anyDemo && <div className="flex items-center gap-2 text-sm text-muted-foreground"><DemoBadge /> Des données de démonstration fictives sont chargées : les chiffres affichés n'ont aucune valeur scientifique.</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Rasters importés" value={rasters.length} />
          <Stat label="Années disponibles" value={years.length ? years.join(" · ") : "—"} />
          <Stat label="Dernier traitement" value={<span className="text-base">{lastJob ? lastJob.type : "—"}</span>} hint={lastJob ? new Date(lastJob.date).toLocaleString("fr-FR") : "Aucun traitement"} />
          <Stat label="Simulations" value={history.filter((h) => h.type === "Simulation Markov").length} />
        </div>
        <div className="grid gap-6 xl:grid-cols-5">
          <Panel title="Zone d'étude" className="xl:col-span-3">
            <div className="h-[420px] overflow-hidden rounded-sm">
              <ClientOnly fallback={<div className="grid-paper h-full" />}>
                <MapView overlays={overlays} vectors={studyArea ? [{ id: studyArea.id, data: studyArea.geojson!, visible: true }] : []} fitTo={overlays[0]?.bounds ?? null} />
              </ClientOnly>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{latest ? `Couche affichée : ${latest.name}` : "Limites de la zone d'étude non importées."}</p>
          </Panel>
          <Panel title="Surfaces par classe (ha)" className="xl:col-span-2">
            {chart.length ? (
              <div className="h-[420px]">
                <ResponsiveContainer>
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="annee" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v) => `${fmtHa(Number(v))} ha`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {classes.map((c) => <Bar key={c.code} dataKey={c.name} stackId="a" fill={c.color} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyData />}
          </Panel>
        </div>
        <Panel title="Dernières simulations">
          {sims.length ? (
            <ul className="divide-y divide-border text-sm">{sims.map((s) => <li key={s.id} className="py-2">{s.label} <span className="text-muted-foreground">· {new Date(s.date).toLocaleString("fr-FR")}</span></li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">Aucune simulation réalisée.</p>}
        </Panel>
      </div>
    </div>
  );
}
