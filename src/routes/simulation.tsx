import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Play, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoBadge, EmptyData, Notice, PageHeader, Panel, RasterSelect, Stat, fmtHa, fmtPct, useRasters } from "@/components/geo/ui";
import { classAreas, computeChange, download, projectMarkov, toCsv, transitionProbabilities } from "@/lib/analysis";
import { checkCompatibility } from "@/lib/raster";
import { uid, useGeo } from "@/lib/store";
import { useResults } from "@/lib/results";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation prospective — GeoSim PSL" },
      { name: "description", content: "Projection de l'occupation du sol par chaîne de Markov et préparation du modèle CA-Markov." },
      { property: "og:title", content: "Simulation prospective — GeoSim PSL" },
      { property: "og:description", content: "Simuler l'occupation du sol pour une année cible choisie." },
    ],
  }),
  component: Simulation,
});

type Model = "markov" | "ca-markov" | "ml";

function Simulation() {
  const rasters = useRasters();
  const { classes, datasets, log } = useGeo();
  const { sim, setSim } = useResults();
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [target, setTarget] = useState(2034);
  const [model, setModel] = useState<Model>("markov");
  const A = rasters.find((r) => r.id === a), B = rasters.find((r) => r.id === b);
  const y1 = A?.year, y2 = B?.year;
  const issues = A && B ? checkCompatibility(A.raster, B.raster) : [];
  const errors: string[] = [];
  if (A && B) {
    if (!y1 || !y2) errors.push("Associez une année à chaque carte (page Données).");
    else if (y2 <= y1) errors.push("La seconde date doit être postérieure à la première.");
    else if (target <= y2) errors.push(`L'année cible doit être postérieure à ${y2}.`);
  }
  if (issues.some((i) => i.level === "error")) errors.push("Les cartes de calibration sont incompatibles (voir page Données).");
  const interval = y1 && y2 ? y2 - y1 : 0;
  const far = interval > 0 && target - (y2 ?? 0) > 2 * interval;
  const codes = classes.map((c) => c.code);
  const names = classes.map((c) => c.name);

  function run() {
    if (!A || !B || !y1 || !y2 || errors.length) return;
    const ch = computeChange(A.raster, B.raster, codes);
    const P = transitionProbabilities(ch.matrix);
    const steps = (target - y2) / interval;
    const predicted = projectMarkov(ch.areaEnd, P, steps);
    const warnings: string[] = [];
    if (far) warnings.push(`Extrapolation : ${target - y2} ans au-delà de la dernière observation, pour une période de calibration de ${interval} ans. Incertitude élevée.`);
    if (!Number.isInteger(steps)) warnings.push(`Nombre de pas non entier (${steps.toFixed(2)}) : la fraction est interpolée linéairement entre deux pas de Markov.`);
    warnings.push("Hypothèse de stationnarité : les probabilités de transition observées sont supposées constantes.");
    // Retrospective check on later observed maps, if any (quantity only)
    const later = rasters.find((r) => r.year && r.year > y2 && r.year <= target && r.id !== B.id && checkCompatibility(B.raster, r.raster).every((i) => i.level !== "error"));
    let backtest;
    if (later?.year) {
      const obs = classAreas(later.raster);
      backtest = { year: later.year, predicted: projectMarkov(ch.areaEnd, P, (later.year - y2) / interval), observed: codes.map((c) => obs.get(c) ?? 0) };
    }
    setSim({ id: uid(), model: "Chaîne de Markov (quantités)", y1, y2, target, steps, codes, P, start: ch.areaEnd, predicted, warnings, demo: !!(A.demo || B.demo), date: new Date().toISOString(), backtest });
    log({ type: "Simulation Markov", label: `Markov ${y1}–${y2} → ${target}`, status: "terminé", details: { steps } });
  }

  if (rasters.length < 2) return (<div><PageHeader title="Simulation prospective" /><div className="p-6"><EmptyData message="Deux cartes historiques sont nécessaires pour calibrer un modèle." /></div></div>);
  const vectors = datasets.filter((d) => d.kind === "vecteur" && d.geojson);

  return (
    <div>
      <PageHeader title="Simulation prospective" subtitle="La projection Markov des superficies est calculée réellement à partir de vos cartes. La spatialisation (CA-Markov) requiert le moteur Python." />
      <div className="space-y-6 p-6">
        <Panel title="Configuration">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RasterSelect label="Carte de calibration t1" value={a} onChange={setA} rasters={rasters} />
            <RasterSelect label="Carte de calibration t2 (carte initiale)" value={b} onChange={setB} rasters={rasters} />
            <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Année cible</span><Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} /></label>
            <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">Modèle</span>
              <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={model} onChange={(e) => setModel(e.target.value as Model)}>
                <option value="markov">Chaîne de Markov (superficies)</option>
                <option value="ca-markov">Cellular Automata–Markov (spatial)</option>
                <option value="ml">Apprentissage automatique</option>
              </select></label>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Variables explicatives disponibles : {vectors.length ? vectors.map((v) => v.name).join(", ") : "aucune importée"} — non utilisées par le modèle Markov.</div>
          <div className="mt-4 space-y-2">
            {errors.map((e) => <Notice key={e} tone="error" title={e} />)}
            {far && !errors.length && <Notice title="Avertissement d'extrapolation">L'année {target} est éloignée de la période d'observation ({y1}–{y2}). La projection doit être interprétée comme un scénario tendanciel, pas une prévision.</Notice>}
          </div>
          {model === "markov" ? (
            <Button className="mt-4" onClick={run} disabled={!A || !B || errors.length > 0}><Play className="mr-1 h-4 w-4" />Lancer la projection</Button>
          ) : (
            <div className="mt-4 flex gap-3 rounded-md border border-border bg-muted p-4 text-sm">
              <ServerOff className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div><div className="font-semibold text-primary">Moteur de simulation non configuré</div>
                <p className="mt-1 text-muted-foreground">Ce modèle produit une carte prédite et nécessite l'API Python (FastAPI + Rasterio, NumPy, SciPy{model === "ml" ? ", scikit-learn" : ""}) exposant <code className="stat-num">POST /simulation/run</code> et <code className="stat-num">GET /jobs/{"{id}"}</code>, ainsi que des cartes d'aptitude issues de variables explicatives réelles (distance aux routes, pente, littoral…). Aucune carte n'est générée tant que ce moteur n'est pas connecté.</p></div>
            </div>
          )}
        </Panel>

        {sim && <SimResult />}
      </div>
    </div>
  );

  function SimResult() {
    const s = sim!;
    const data = s.codes.map((_, i) => ({ classe: names[i], [`${s.y2} (observé)`]: +s.start[i].toFixed(1), [`${s.target} (projeté)`]: +s.predicted[i].toFixed(1) }));
    const tot = s.start.reduce((x, y) => x + y, 0);
    return (
      <>
        {s.demo && <div className="flex items-center gap-2 text-sm"><DemoBadge /> Projection calculée sur des données fictives.</div>}
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Modèle" value={<span className="text-base">Markov</span>} hint="Superficies uniquement, pas de carte" />
          <Stat label="Calibration" value={`${s.y1}–${s.y2}`} />
          <Stat label="Année cible" value={s.target} />
          <Stat label="Pas de Markov" value={s.steps.toFixed(2)} />
        </div>
        <div className="space-y-2">{s.warnings.map((w) => <Notice key={w} title={w} />)}</div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Superficies observées et projetées (ha)">
            <div className="h-72"><ResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="classe" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend /><Bar dataKey={`${s.y2} (observé)`} fill="var(--color-chart-5)" /><Bar dataKey={`${s.target} (projeté)`} fill="var(--color-accent)" /></BarChart></ResponsiveContainer></div>
          </Panel>
          <Panel title={`Probabilités de transition (${s.y1}→${s.y2})`} right={<Button size="sm" variant="outline" onClick={() => download(`markov_${s.target}.csv`, toCsv([["Classe", `${s.y2} (ha)`, `${s.target} projeté (ha)`, "Variation (ha)"], ...s.codes.map((_, i) => [names[i], s.start[i].toFixed(2), s.predicted[i].toFixed(2), (s.predicted[i] - s.start[i]).toFixed(2)])]))}><Download className="mr-1 h-3 w-3" />CSV</Button>}>
            <table className="stat-num w-full text-xs"><thead><tr><th />{names.map((n) => <th key={n} className="p-1 text-right font-sans">{n}</th>)}</tr></thead>
              <tbody>{s.P.map((r, i) => <tr key={i} className="border-t border-border"><td className="p-1 font-sans">{names[i]}</td>{r.map((p, j) => <td key={j} className={`p-1 text-right ${i === j ? "bg-secondary" : ""}`}>{p.toFixed(3)}</td>)}</tr>)}</tbody></table>
            <table className="stat-num mt-4 w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left font-sans">Classe</th><th className="text-right">Variation attendue</th><th className="text-right">Part {s.target}</th></tr></thead>
              <tbody>{s.codes.map((_, i) => <tr key={i} className="border-t border-border"><td className="py-1 font-sans">{names[i]}</td><td className="text-right">{(s.predicted[i] >= s.start[i] ? "+" : "") + fmtHa(s.predicted[i] - s.start[i])} ha</td><td className="text-right">{fmtPct(s.predicted[i] / tot)}</td></tr>)}</tbody></table>
          </Panel>
        </div>
        <Panel title="Contrôle rétrospectif">
          {s.backtest ? (
            <div className="text-sm">
              <p className="mb-2 text-muted-foreground">Comparaison des superficies projetées pour {s.backtest.year} avec la carte observée de {s.backtest.year}. Il s'agit d'un contrôle de quantité, pas d'une validation spatiale (voir module Validation).</p>
              <table className="stat-num w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left font-sans">Classe</th><th className="text-right">Projeté</th><th className="text-right">Observé</th><th className="text-right">Écart</th></tr></thead>
                <tbody>{s.codes.map((_, i) => <tr key={i} className="border-t border-border"><td className="py-1 font-sans">{names[i]}</td><td className="text-right">{fmtHa(s.backtest!.predicted[i])}</td><td className="text-right">{fmtHa(s.backtest!.observed[i])}</td><td className="text-right">{fmtHa(s.backtest!.predicted[i] - s.backtest!.observed[i])}</td></tr>)}</tbody></table>
            </div>
          ) : <p className="text-sm text-muted-foreground">Aucune carte observée postérieure à {s.y2} n'est disponible : le modèle n'a pas été évalué.</p>}
        </Panel>
      </>
    );
  }
}
