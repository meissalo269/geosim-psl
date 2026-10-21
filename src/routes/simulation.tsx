import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Play, ServerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/geo/MapView";
import { ChartLegend, ChartPanel } from "@/components/geo/ChartPanel";
import { DemoBadge, EmptyData, Notice, PageHeader, Panel, RasterSelect, Stat, fmtHa, fmtPct, useRasters } from "@/components/geo/ui";
import { classAreas, computeChange, download, projectMarkov, toCsv, transitionProbabilities } from "@/lib/analysis";
import { checkCompatibility, renderToDataUrl, wgs84Bounds } from "@/lib/raster";
import { spatialMarkov, type SpatialModel } from "@/lib/spatial-markov";
import { exportGeoTiff, exportMapPng } from "@/lib/raster-export";
import { uid, useGeo } from "@/lib/store";
import { useResults, type SimRun } from "@/lib/results";

export const Route = createFileRoute("/simulation")({
  head: () => ({ meta: [
    { title: "Cartes et projections Markov — GeoSim PSL" },
    { name: "description", content: "Scénarios d’occupation du sol par Markov et CA-Markov simplifié, exports graphiques et GeoTIFF." },
    { property: "og:title", content: "Cartes et projections Markov — GeoSim PSL" },
    { property: "og:description", content: "Calculer et exporter un scénario cartographique d’occupation du sol." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Simulation,
});

function Simulation() {
  const rasters = useRasters();
  const historical = rasters.filter((r) => !r.isPrediction).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const { classes, addDataset, log } = useGeo();
  const { sim, setSim } = useResults();
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [target, setTarget] = useState(2030);
  const MAX_TARGET = 2030;
  const [model, setModel] = useState<SpatialModel | "ml">("markov");
  const [seed, setSeed] = useState(42);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState("");
  const A = historical.find((r) => r.id === (a || historical[0]?.id));
  const B = historical.find((r) => r.id === (b || historical[1]?.id));
  const y1 = A?.year, y2 = B?.year;
  const errors: string[] = [];
  const codes = classes.map((c) => c.code);
  if (!codes.length || new Set(codes).size !== codes.length || codes.some((c) => !Number.isInteger(c))) errors.push("Corrigez la légende : codes entiers uniques requis.");
  if (A && B) {
    errors.push(...checkCompatibility(A.raster, B.raster).filter((i) => i.level === "error").map((i) => i.message));
    if (!y1 || !y2) errors.push("Associez une année à chaque carte sur la page Données.");
    else if (y2 <= y1) errors.push("La seconde date doit être postérieure à la première.");
    else if (!Number.isInteger(target) || target <= y2) errors.push(`L’année cible doit être un entier postérieur à ${y2}.`);
    else if (target > MAX_TARGET) errors.push(`L’horizon de prédiction est limité à ${MAX_TARGET} (au-delà, l’extrapolation n’est pas scientifiquement justifiable).`);
    if ([A, B].some((r) => r.raster.uniques.some((u) => !codes.includes(u.value)))) errors.push("Des valeurs des cartes sont absentes de la légende. Corrigez les classes avant simulation.");
  }
  if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) errors.push("La graine doit être un entier entre 1 et 2147483646.");
  const interval = y1 && y2 ? y2 - y1 : 0;
  const steps = interval > 0 && y2 ? (target - y2) / interval : 0;
  if (steps > 100) errors.push("La projection est limitée à 100 pas de Markov.");
  const far = steps > 2;

  async function run() {
    if (!A || !B || !y1 || !y2 || errors.length || busy || model === "ml") return;
    setBusy(true); setFailure(""); setProgress(0);
    try {
      const ch = computeChange(A.raster, B.raster, codes);
      if (!ch.total) throw new Error("Aucun pixel valide commun aux cartes de calibration.");
      const P = transitionProbabilities(ch.matrix);
      const startAreas = classAreas(B.raster);
      const start = codes.map((c) => startAreas.get(c) ?? 0);
      const predicted = projectMarkov(start, P, steps);
      const warnings: string[] = [];
      if (far) warnings.push(`Extrapolation élevée : ${target - y2} ans pour ${interval} ans de calibration.`);
      if (!Number.isInteger(steps)) warnings.push("Quantités : interpolation entre deux pas. Carte : transition fractionnaire sur le dernier pas ; les deux méthodes peuvent différer.");
      if (ch.matrix.some((r) => r.every((v) => v === 0))) warnings.push("Classe absente à t1 : maintien de sa classe par défaut, faute de transitions observées.");
      if (model === "ca-markov") warnings.push("CA-Markov simplifié : voisinage 3×3, poids 1 + proportion locale de la classe. Sans cartes d’aptitude, pente ou contraintes ; les probabilités et quantités sont modifiées par le voisinage.");
      const raster = await spatialMarkov(B.raster, codes, P, steps, model, seed, setProgress);
      const actual = classAreas(raster);
      const later = historical.find((r) => r.year && r.year > y2 && r.year <= target && checkCompatibility(B.raster, r.raster).every((i) => i.level !== "error"));
      const backtest = later?.year ? { year: later.year, predicted: projectMarkov(start, P, (later.year - y2) / interval), observed: codes.map((c) => classAreas(later.raster).get(c) ?? 0) } : undefined;
      const id = uid(), demo = !!(A.demo || B.demo), date = new Date().toISOString();
      const label = model === "markov" ? "Markov spatial stochastique" : "CA-Markov simplifié";
      setSim({ id, model: label, y1, y2, target, steps, codes, P, start, predicted, warnings, demo, date, backtest, raster, mapAreas: codes.map((c) => actual.get(c) ?? 0), legend: classes.map((c) => ({ ...c })), seed });
      addDataset({ id: `prediction-${id}`, name: `${demo ? "FICTIF_" : ""}${model}_${target}_${seed}.tif`, format: "Carte simulée", kind: "raster", size: raster.data.byteLength, year: target, raster, status: "avertissement", messages: warnings, demo, isPrediction: true, createdAt: date });
      log({ type: "Simulation Markov", label: `${label} ${y1}–${y2} → ${target}`, status: "terminé", details: { seed, steps } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setFailure(message); log({ type: "Simulation Markov", label: message, status: "erreur" });
    } finally { setBusy(false); }
  }
  if (historical.length < 2) return <div><PageHeader title="Simulation prospective" /><div className="p-6"><EmptyData message="Deux cartes historiques sont nécessaires pour calibrer le modèle." /></div></div>;
  return <div><PageHeader title="Simulation prospective" /><div className="space-y-6 p-6">
    <Panel title="Configuration"><fieldset disabled={busy} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <RasterSelect label="Carte de calibration t1" value={A?.id ?? ""} onChange={setA} rasters={historical} />
      <RasterSelect label="Carte de calibration t2 (carte initiale)" value={B?.id ?? ""} onChange={setB} rasters={historical} />
      <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Année cible (max 2030)</span><Input type="number" min={2024} max={MAX_TARGET} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label>
      <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Modèle</span><select className="h-9 w-full rounded-md border border-input bg-card px-2" value={model} onChange={(e) => setModel(e.target.value as SpatialModel | "ml")}><option value="markov">Markov spatial stochastique</option><option value="ca-markov">CA-Markov simplifié (3×3)</option><option value="ml">Apprentissage automatique</option></select></label>
      <label className="text-sm"><span className="mb-1 block text-xs text-muted-foreground">Graine aléatoire</span><Input type="number" min={1} max={2147483646} value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></label>
    </fieldset>
    <div className="mt-4 space-y-2">{errors.map((e) => <Notice key={e} tone="error" title={e} />)}{far && !errors.length && <Notice title="Extrapolation élevée">Scénario tendanciel éloigné de la période de calibration.</Notice>}{failure && <Notice tone="error" title={failure} />}</div>
    {model === "ml" ? <Notice title="Moteur de simulation non configuré"><ServerOff className="inline h-4 w-4" /> L’apprentissage automatique nécessite un modèle entraîné et des variables explicatives réelles.</Notice> : <Button className="mt-4" onClick={run} disabled={busy || !A || !B || errors.length > 0}><Play className="mr-1 h-4 w-4" />{busy ? `Calcul en cours… ${progress} %` : "Produire la carte prédite"}</Button>}
    </Panel>{sim && <SimResult s={sim} />}
  </div></div>;
}

function SimResult({ s }: { s: SimRun }) {
  const classes = useGeo((state) => state.classes);
  const legend = s.legend ?? classes;
  const names = s.codes.map((c) => legend.find((cl) => cl.code === c)?.name ?? String(c));
  const overlay = useMemo(() => {
    if (!s.raster || typeof document === "undefined") return null;
    const bounds = wgs84Bounds(s.raster);
    const url = renderToDataUrl(s.raster, (v) => legend.find((c) => c.code === v)?.color ?? null);
    return { id: s.id, url, bounds, visible: true, opacity: 0.9 };
  }, [s, legend]);
  const data = s.codes.map((_, i) => ({ classe: names[i], Observé: s.start[i], "Markov théorique": s.predicted[i], "Carte simulée": s.mapAreas?.[i] ?? 0 }));
  const file = `${s.demo ? "FICTIF_" : ""}prediction_${s.target}_${s.seed ?? 42}`;
  async function mapExport(format: "png" | "tif") {
    try {
      if (format === "tif" && s.raster) exportGeoTiff(s.raster, `${file}.tif`);
      else if (overlay) await exportMapPng(overlay.url, legend, `${s.model} · ${s.target} · graine ${s.seed}`, `${file}.png`, s.demo);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export impossible."); }
  }
  return <>
    {s.demo && <div className="flex items-center gap-2 text-sm"><DemoBadge /> Projection sur données fictives.</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Modèle" value={<span className="text-base">{s.model}</span>} /><Stat label="Calibration" value={`${s.y1}–${s.y2}`} /><Stat label="Année cible" value={s.target} /></div>
    <div className="space-y-2">{s.warnings.map((w) => <Notice key={w} title={w} />)}</div>
    {s.raster && <Panel title={`Carte prédite ${s.target}`} right={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => mapExport("png")}><Download className="mr-1 h-3 w-3" />PNG</Button><Button size="sm" variant="outline" disabled={!s.raster.epsg} onClick={() => mapExport("tif")}><Download className="mr-1 h-3 w-3" />GeoTIFF</Button></div>}>
      <div className="h-[420px]"><ClientOnly fallback={null}>{overlay?.bounds ? <MapView overlays={[{ ...overlay, bounds: overlay.bounds }]} fitTo={overlay.bounds} basemap="clair" /> : <Notice title="CRS non affichable">La carte peut être exportée mais pas superposée au fond cartographique.</Notice>}</ClientOnly></div>
      <div className="mt-3 flex flex-wrap gap-4">{legend.map((c) => <span key={c.code} className="flex items-center gap-2 text-xs"><span className="h-3 w-4" style={{ background: c.color }} />{c.name}</span>)}</div>
    </Panel>}
    <ChartPanel title="Superficies observées et projetées (ha)" filename={`superficies_${s.target}`} demo={s.demo} context={`${s.model} · calibration ${s.y1}–${s.y2} · cible ${s.target} · graine ${s.seed}`}>
      <div className="h-80"><ResponsiveContainer><BarChart data={data} margin={{ bottom: 45 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="classe" fontSize={10} interval={0} angle={-15} textAnchor="end" /><YAxis fontSize={11} /><Tooltip /><Legend content={<ChartLegend />} /><Bar dataKey="Observé" fill="var(--color-chart-5)" isAnimationActive={false} /><Bar dataKey="Markov théorique" fill="var(--color-sky)" isAnimationActive={false} /><Bar dataKey="Carte simulée" fill="var(--color-accent)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
    </ChartPanel>
    <Panel title={`Probabilités historiques (${s.y1}→${s.y2})`} right={<Button size="sm" variant="outline" onClick={() => download(`${file}.csv`, toCsv([[s.model, `Calibration ${s.y1}–${s.y2}`, `Graine ${s.seed}`, s.demo ? "FICTIF" : "Scénario non validé"], ["Classe", `${s.y2} (ha)`, `${s.target} théorique (ha)`, `${s.target} carte (ha)`], ...s.codes.map((_, i) => [names[i], s.start[i], s.predicted[i], s.mapAreas?.[i] ?? ""])]))}><Download className="mr-1 h-3 w-3" />CSV</Button>}>
      <div className="overflow-x-auto"><table className="stat-num w-full text-xs"><thead><tr><th />{names.map((n) => <th key={n} className="p-2 text-right font-sans">{n}</th>)}</tr></thead><tbody>{s.P.map((row, i) => <tr key={i} className="border-t border-border"><td className="p-2 font-sans">{names[i]}</td>{row.map((p, j) => <td key={j} className="p-2 text-right">{p.toFixed(3)}</td>)}</tr>)}</tbody></table></div>
    </Panel>
    <Panel title="Contrôle rétrospectif des quantités Markov">{s.backtest ? <div className="overflow-x-auto"><table className="stat-num w-full text-xs"><thead><tr><th className="text-left">Classe</th><th>Projeté {s.backtest.year}</th><th>Observé {s.backtest.year}</th><th>Écart (ha)</th></tr></thead><tbody>{s.codes.map((_, i) => { const test = s.backtest; if (!test) return null; return <tr key={i}><td className="py-2 font-sans">{names[i]}</td><td className="text-center">{fmtHa(test.predicted[i])}</td><td className="text-center">{fmtHa(test.observed[i])}</td><td className="text-center">{fmtHa(test.predicted[i] - test.observed[i])}</td></tr>; })}</tbody></table><p className="mt-2 text-xs text-muted-foreground">Ce contrôle porte uniquement sur les quantités Markov théoriques, pas sur la carte simulée.</p></div> : <p className="text-sm text-muted-foreground">Aucune observation postérieure à {s.y2} : modèle non évalué indépendamment.</p>}</Panel>
  </>;
}
