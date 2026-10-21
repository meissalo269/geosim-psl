import { ClientOnly, createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Database, MapPin, Microscope, Waves } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView, type OverlayLayer } from "@/components/geo/MapView";
import { DemoBadge, useRasters } from "@/components/geo/ui";
import { useGeo } from "@/lib/store";
import { useClassColor } from "@/lib/geo-hooks";
import { renderToDataUrl, wgs84Bounds } from "@/lib/raster";
import { loadPslInputs } from "@/lib/psl-inputs";
import boundaryAsset from "@/assets/psl-boundary.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "GeoSim PSL — Observer, analyser et anticiper" },
    { name: "description", content: "Plateforme WebSIG scientifique de Port-Saint-Louis-du-Rhône. Classifications 2018, 2021, 2024 et scénarios exploratoires à l’horizon 2030." },
    { property: "og:title", content: "GeoSim PSL — Observatoire de Port-Saint-Louis-du-Rhône" },
    { property: "og:description", content: "Cartographie, analyse des transitions et simulation spatiale par Cheikh Ahmed Fadel Keita et Meïssa Lo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

function Home() {
  const rasters = useRasters();
  const datasets = useGeo((s) => s.datasets);
  const classes = useGeo((s) => s.classes);
  const colorOf = useClassColor();
  const hydrated = useHydrated();
  const [year, setYear] = useState(2024);
  const [busy, setBusy] = useState(false);
  const [boundary, setBoundary] = useState<GeoJSON.GeoJsonObject>();
  const [boundaryError, setBoundaryError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(boundaryAsset.url, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error("Limite indisponible"); return r.json(); }).then(setBoundary).catch(() => { if (!controller.signal.aborted) setBoundaryError(true); });
    return () => controller.abort();
  }, []);
  const selected = rasters.find((r) => r.year === year && !r.isPrediction && !r.demo) ?? rasters.find((r) => r.year === year && !r.isPrediction);
  const study = datasets.find((d) => d.isStudyArea)?.geojson ?? boundary;
  const overlays = useMemo<OverlayLayer[]>(() => {
    if (!selected || !hydrated) return [];
    const bounds = wgs84Bounds(selected.raster);
    return bounds ? [{ id: selected.id, bounds, url: renderToDataUrl(selected.raster, colorOf), visible: true, opacity: 0.8 }] : [];
  }, [selected, colorOf, hydrated]);
  async function load() {
    setBusy(true);
    try {
      const inputs = await loadPslInputs();
      inputs.forEach((d) => { const s = useGeo.getState(); if (s.datasets.some((x) => x.id === d.id)) s.updateDataset(d.id, d); else s.addDataset(d); });
      useGeo.getState().log({ type: "Import", label: "Cartes PSL 2018, 2021, 2024 et limite chargées", status: "terminé" });
      toast.success("Vos trois classifications PSL sont chargées.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Chargement impossible."); }
    finally { setBusy(false); }
  }
  return <div>
    <section className="scientific-cover relative isolate overflow-hidden border-b border-border">
      <div className="absolute inset-0 z-0" aria-label="Carte interactive de Port-Saint-Louis-du-Rhône">
        <ClientOnly fallback={<div className="h-full bg-secondary" />}>
          <MapView basemap="clair" overlays={overlays} vectors={study ? [{ id: "psl-study", data: study, visible: true }] : []} fitTo={overlays[0]?.bounds ?? null} />
        </ClientOnly>
      </div>
      <header className="pointer-events-none relative z-[400] max-w-3xl px-6 pb-12 pt-10 md:px-10">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><MapPin className="h-4 w-4" />Port-Saint-Louis-du-Rhône · Bouches-du-Rhône</p>
        <h1 className="text-4xl font-semibold leading-tight text-primary md:text-5xl">GeoSim PSL</h1>
        <p className="mt-3 max-w-xl text-xl font-medium text-foreground">Observer, analyser et anticiper les transformations territoriales</p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Une plateforme WebSIG dédiée à l’analyse spatio-temporelle de l’occupation du sol, à la télédétection et à la modélisation prospective.</p>
      </header>
      <div className="absolute bottom-5 left-5 right-5 z-[400] flex flex-wrap items-center justify-between gap-3 md:left-10 md:right-10">
        <div className="flex gap-1 border border-border bg-card p-1" aria-label="Année cartographiée">{[2018, 2021, 2024].map((y) => <Button key={y} size="sm" variant={year === y ? "default" : "ghost"} onClick={() => setYear(y)}>{y}</Button>)}</div>
        <div className="border border-border bg-card px-3 py-2 text-xs text-foreground">{selected ? <>{selected.demo && <DemoBadge />} Classification {year} · fond extérieur exclu</> : boundaryError ? "Limite indisponible · fond Esri" : "Limite fournie · classifications non chargées"}</div>
      </div>
    </section>
    <section className="border-b border-border bg-card px-6 py-5 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-medium">2018 → 2021 → 2024 <span className="text-accent">→ 2030</span></p><p className="mt-1 text-xs text-muted-foreground">Observations historiques · Horizon exploratoire 2030</p></div>
        <div className="flex flex-wrap gap-2"><Button onClick={load} disabled={busy} variant="outline"><Database className="h-4 w-4" />{busy ? "Chargement…" : "Charger mes cartes PSL"}</Button><Button asChild variant="outline"><Link to="/carte">Explorer la carte <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild><Link to="/analyse">Lancer une analyse <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/simulation">Accéder aux simulations</Link></Button></div>
      </div>
      {selected && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">{classes.map((c) => <span key={c.code} className="flex items-center gap-2"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" fill={c.color} /></svg>{c.name}</span>)}</div>}
    </section>
    <section className="grid gap-8 px-6 py-9 md:grid-cols-2 md:px-10">
      <div><Microscope className="mb-3 h-6 w-6 text-sky" /><h2 className="text-xl font-semibold">Une démarche scientifique traçable</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Comparer les classifications, mesurer les gains et pertes, puis explorer des scénarios spatiaux reproductibles. Les surfaces et matrices sont calculées à partir des pixels valides, après exclusion du fond extérieur à la limite fournie.</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Les cartes fournies sont issues de Random Forest sous TerrSet. CORINE Land Cover 2018 a servi à l’entraînement : cette source ne constitue pas une validation indépendante.</p><Button asChild variant="link" className="mt-2 px-0"><Link to="/documentation">Méthodes et limites <ArrowRight className="h-4 w-4" /></Link></Button></div>
      <div><Waves className="mb-3 h-6 w-6 text-accent" /><h2 className="text-xl font-semibold">Pourquoi cette étude ?</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">L’artificialisation, la dynamique de la végétation et la préservation de l’eau et des zones humides sont des enjeux majeurs de suivi territorial. Les changements cartographiés doivent être distingués des erreurs de classification avant toute interprétation locale.</p><p className="mt-4 text-sm font-medium">Cheikh Ahmed Fadel Keita et Meïssa Lo</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Master 1 Géomatique et Modélisation spatiale<br />Aix-Marseille Université</p></div>
    </section>
  </div>;
}
