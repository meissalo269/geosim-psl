import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Play } from "lucide-react";
import { ChartPanel } from "@/components/geo/ChartPanel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/geo/MapView";
import { DemoBadge, EmptyData, Notice, PageHeader, Panel, RasterSelect, Stat, fmtHa, fmtPct, useRasters } from "@/components/geo/ui";
import { computeChange, exportMatrixCsv } from "@/lib/analysis";
import { checkCompatibility, finalize, renderToDataUrl, wgs84Bounds } from "@/lib/raster";
import { uid, useGeo } from "@/lib/store";
import { useResults } from "@/lib/results";

export const Route = createFileRoute("/analyse")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Analyse diachronique — GeoSim PSL" },
      { name: "description", content: "Matrice de transition, gains, pertes et carte des changements entre deux dates." },
      { property: "og:title", content: "Analyse diachronique — GeoSim PSL" },
      { property: "og:description", content: "Calcul des changements d'occupation du sol entre deux cartes." },
    ],
  }),
  component: Analyse,
});

function Analyse() {
  const rasters = useRasters();
  const { classes, log } = useGeo();
  const { change, setChange } = useResults();
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [sel, setSel] = useState<number[]>(classes.map((c) => c.code));
  const [mapMode, setMapMode] = useState<"change" | "transition">("change");
  const A = rasters.find((r) => r.id === a), B = rasters.find((r) => r.id === b);
  const issues = A && B ? checkCompatibility(A.raster, B.raster) : [];
  const blocking = issues.some((i) => i.level === "error");
  const names = (codes: number[]) => codes.map((c) => classes.find((k) => k.code === c)?.name ?? String(c));

  function run() {
    if (!A || !B || blocking || a === b || sel.length < 2) return;
    const result = computeChange(A.raster, B.raster, sel);
    if (!result.total) { toast.error("Aucun pixel valide commun pour les classes choisies."); return; }
    setChange({ sourceRaster: A.raster, id: uid(), fromName: A.name, toName: B.name, y1: A.year ?? 0, y2: B.year ?? 0, result, demo: !!(A.demo || B.demo), date: new Date().toISOString() });
    log({ type: "Analyse diachronique", label: `${A.year ?? "?"} → ${B.year ?? "?"} : ${fmtHa(result.changed)} ha modifiés`, status: "terminé" });
  }

  const overlay = useMemo(() => {
    if (!change || typeof document === "undefined") return null;
    const source = change.sourceRaster;
    if (!source) return null;
    const r = change.result;
    const bounds = wgs84Bounds(source);
    if (!bounds) return null;
    const n = r.codes.length;
    const palette = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#800000", "#aaffc3", "#808000"];
    const data = new Int32Array(mapMode === "change" ? r.changeMap : r.transitionMap);
    const ras = finalize({ ...source, data, nodata: 0 });
    const url = renderToDataUrl(ras, (v) => mapMode === "change" ? (v === 2 ? "#d64545" : "#dfe6ee") : ((v - 1) % (n + 1) === 0 ? null : palette[(v - 1) % palette.length]));
    return { id: "chg", url, bounds, opacity: 0.85, visible: true };
  }, [change, A, mapMode]);

  if (rasters.length < 2) return (<div><PageHeader title="Analyse diachronique" /><div className="p-6"><EmptyData message="Au moins deux rasters classifiés sont nécessaires." /></div></div>);

  const r = change?.result;
  const nm = r ? names(r.codes) : [];
  const gl = r ? r.codes.map((_, i) => ({ classe: nm[i], Gains: +(r.areaEnd[i] - r.matrix[i][i]).toFixed(1), Pertes: -+(r.areaStart[i] - r.matrix[i][i]).toFixed(1) })) : [];
  const ar = r ? r.codes.map((_, i) => ({ classe: nm[i], [String(change?.y1)]: +r.areaStart[i].toFixed(1), [String(change?.y2)]: +r.areaEnd[i].toFixed(1) })) : [];

  return (
    <div>
      <PageHeader title="Analyse diachronique" subtitle="Calcul effectué dans le navigateur sur les rasters importés (taille limitée). Surfaces en hectares, NoData exclus, aire des pixels corrigée pour les CRS géographiques." />
      <div className="space-y-6 p-6">
        <Panel title="Paramètres">
          <div className="grid gap-4 md:grid-cols-3">
            <RasterSelect label="Carte initiale" value={a} onChange={setA} rasters={rasters} />
            <RasterSelect label="Carte finale" value={b} onChange={setB} rasters={rasters} />
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Classes à comparer</span>
              <div className="flex flex-wrap gap-2">{classes.map((c) => (
                <label key={c.code} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                  <input type="checkbox" checked={sel.includes(c.code)} onChange={(e) => setSel(e.target.checked ? [...sel, c.code].sort() : sel.filter((x) => x !== c.code))} />
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.name}
                </label>))}</div>
            </div>
          </div>
          {issues.length > 0 && <div className="mt-4"><Notice tone={blocking ? "error" : "warning"} title={blocking ? "Rasters incompatibles — calcul impossible" : "Avertissements"}><ul className="list-disc pl-4">{issues.map((i, k) => <li key={k}>{i.message}</li>)}</ul></Notice></div>}
          <div className="mt-4"><Button onClick={run} disabled={!A || !B || a === b || blocking || sel.length < 2}><Play className="mr-1 h-4 w-4" />Calculer les changements</Button></div>
        </Panel>

        {r && change && (
          <>
            {change.demo && <div className="flex items-center gap-2 text-sm"><DemoBadge /> Résultats calculés sur des données fictives.</div>}
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Surface analysée" value={`${fmtHa(r.total)} ha`} />
              <Stat label="Surface stable" value={`${fmtHa(r.stable)} ha`} hint={fmtPct(r.stable / r.total)} />
              <Stat label="Surface modifiée" value={`${fmtHa(r.changed)} ha`} hint={fmtPct(r.changed / r.total)} />
              <Stat label="Période" value={`${change.y1}→${change.y2}`} />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Carte" right={<select className="h-7 rounded border border-input bg-card text-xs" value={mapMode} onChange={(e) => setMapMode(e.target.value as "change" | "transition")}><option value="change">Changements</option><option value="transition">Transitions par catégorie</option></select>}>
                <div className="h-[380px] overflow-hidden rounded-sm"><ClientOnly fallback={null}><MapView overlays={overlay ? [overlay] : []} fitTo={overlay?.bounds ?? null} basemap="clair" /></ClientOnly></div>
                <p className="mt-2 text-xs text-muted-foreground">{mapMode === "change" ? "Rouge : changement · gris : stable" : "Couleur par transition (pixels stables masqués)"}</p>
              </Panel>
              <Panel title="Matrice de transition (ha)" right={<Button size="sm" variant="outline" onClick={() => exportMatrixCsv(nm, r.matrix, `matrice_${change.y1}_${change.y2}.csv`)}><Download className="mr-1 h-3 w-3" />CSV</Button>}>
                <div className="overflow-x-auto">
                  <table className="stat-num w-full text-xs">
                    <thead><tr><th className="p-1 text-left">{change.y1} \ {change.y2}</th>{nm.map((n) => <th key={n} className="p-1 text-right font-sans">{n}</th>)}<th className="p-1 text-right">Total</th></tr></thead>
                    <tbody>{r.matrix.map((row, i) => (
                      <tr key={i} className="border-t border-border"><td className="p-1 font-sans font-medium">{nm[i]}</td>
                        {row.map((x, j) => <td key={j} className={`p-1 text-right ${i === j ? "bg-secondary font-semibold" : ""}`}>{fmtHa(x)}<div className="text-[10px] text-muted-foreground">{r.areaStart[i] ? fmtPct(x / r.areaStart[i]) : "—"}</div></td>)}
                        <td className="p-1 text-right">{fmtHa(r.areaStart[i])}</td></tr>))}
                      <tr className="border-t-2 border-border"><td className="p-1 font-sans">Total</td>{r.areaEnd.map((x, j) => <td key={j} className="p-1 text-right">{fmtHa(x)}</td>)}<td className="p-1 text-right">{fmtHa(r.total)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
              <ChartPanel title="Superficies par année (ha)" filename="superficies_analyse" demo={change.demo} context={`${change.y1}–${change.y2}`}>
                <div className="h-72"><ResponsiveContainer><BarChart data={ar}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="classe" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar isAnimationActive={false} dataKey={String(change.y1)} fill="var(--color-chart-5)" /><Bar isAnimationActive={false} dataKey={String(change.y2)} fill="var(--color-sky)" /></BarChart></ResponsiveContainer></div>
              </ChartPanel>
              <ChartPanel title="Gains et pertes (ha)" filename="gains_pertes" demo={change.demo} context={`${change.y1}–${change.y2}`}>
                <div className="h-72"><ResponsiveContainer><BarChart data={gl}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="classe" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><ReferenceLine y={0} stroke="var(--color-foreground)" /><Bar isAnimationActive={false} dataKey="Gains" fill="var(--color-accent)" /><Bar isAnimationActive={false} dataKey="Pertes" fill="var(--color-destructive)" /></BarChart></ResponsiveContainer></div>
              </ChartPanel>
            </div>
            <Panel title="Statistiques par classe">
              <table className="stat-num w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-sans">Classe</th><th className="text-right">{change.y1} (ha)</th><th className="text-right">{change.y2} (ha)</th><th className="text-right">Changement net</th><th className="text-right">Gains</th><th className="text-right">Pertes</th></tr></thead>
                <tbody>{r.codes.map((_, i) => <tr key={i} className="border-t border-border"><td className="py-1 font-sans">{nm[i]}</td><td className="text-right">{fmtHa(r.areaStart[i])}</td><td className="text-right">{fmtHa(r.areaEnd[i])}</td><td className="text-right">{(r.areaEnd[i] - r.areaStart[i] >= 0 ? "+" : "") + fmtHa(r.areaEnd[i] - r.areaStart[i])}</td><td className="text-right">{fmtHa(r.areaEnd[i] - r.matrix[i][i])}</td><td className="text-right">{fmtHa(r.areaStart[i] - r.matrix[i][i])}</td></tr>)}</tbody>
              </table>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
