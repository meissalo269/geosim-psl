import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, EmptyData, Notice, PageHeader, Panel, RasterSelect, Stat, fmtPct, useRasters } from "@/components/geo/ui";
import { computeValidation, download, toCsv } from "@/lib/analysis";
import { checkCompatibility } from "@/lib/raster";
import { uid, useGeo } from "@/lib/store";
import { useResults } from "@/lib/results";

export const Route = createFileRoute("/validation")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Validation scientifique — GeoSim PSL" },
      { name: "description", content: "Matrice de confusion, précision globale, Kappa et F1 entre carte prédite et carte observée." },
      { property: "og:title", content: "Validation scientifique — GeoSim PSL" },
      { property: "og:description", content: "Évaluer une carte prédite face à une carte observée." },
    ],
  }),
  component: Validation,
});

function Validation() {
  const rasters = useRasters();
  const { classes, log } = useGeo();
  const { validation: v, setValidation } = useResults();
  const [o, setO] = useState(""); const [p, setP] = useState("");
  const O = rasters.find((r) => r.id === o), Pr = rasters.find((r) => r.id === p);
  const issues = O && Pr ? checkCompatibility(O.raster, Pr.raster) : [];
  const blocking = issues.some((i) => i.level === "error");
  const names = classes.map((c) => c.name);

  function run() {
    if (!O || !Pr) return;
    const result = computeValidation(O.raster, Pr.raster, classes.map((c) => c.code));
    setValidation({ id: uid(), observed: O.name, predicted: Pr.name, year: O.year, result, demo: !!(O.demo || Pr.demo), date: new Date().toISOString() });
    log({ type: "Validation", label: `${Pr.name} vs ${O.name} : OA ${fmtPct(result.overall)}, κ ${result.kappa.toFixed(3)}`, status: "terminé" });
  }

  if (rasters.length < 2) return (<div><PageHeader title="Validation scientifique" /><div className="p-6"><EmptyData message="Une carte observée et une carte prédite (même année) sont nécessaires." /></div></div>);

  return (
    <div>
      <PageHeader title="Validation scientifique" subtitle="Comparaison pixel à pixel d'une carte prédite (produite par le moteur de simulation et importée) avec une carte observée indépendante." />
      <div className="space-y-6 p-6">
        <Panel title="Cartes à comparer">
          <div className="grid gap-4 md:grid-cols-2">
            <RasterSelect label="Carte observée (référence)" value={o} onChange={setO} rasters={rasters} />
            <RasterSelect label="Carte prédite" value={p} onChange={setP} rasters={rasters} />
          </div>
          <div className="mt-4 space-y-2">
            {O && Pr && O.year !== Pr.year && <Notice title="Années différentes">Les deux cartes ne portent pas sur la même année ({O.year ?? "?"} / {Pr.year ?? "?"}). La comparaison ne constitue pas une validation.</Notice>}
            {issues.length > 0 && <Notice tone={blocking ? "error" : "warning"} title={blocking ? "Cartes non alignées" : "Avertissements"}><ul className="list-disc pl-4">{issues.map((i, k) => <li key={k}>{i.message}</li>)}</ul></Notice>}
          </div>
          <Button className="mt-4" onClick={run} disabled={!O || !Pr || o === p || blocking}><Play className="mr-1 h-4 w-4" />Calculer les métriques</Button>
        </Panel>
        {v ? (
          <>
            {v.demo && <div className="flex items-center gap-2 text-sm"><DemoBadge /> Métriques calculées sur des données fictives.</div>}
            <div className="grid gap-4 sm:grid-cols-4">
              <Stat label="Précision globale" value={fmtPct(v.result.overall)} />
              <Stat label="Kappa de Cohen" value={v.result.kappa.toFixed(3)} />
              <Stat label="Pixels comparés" value={v.result.n.toLocaleString("fr-FR")} hint="NoData exclus" />
              <Stat label="Année de référence" value={v.year ?? "?"} />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Matrice de confusion (pixels)" right={<Button size="sm" variant="outline" onClick={() => download("matrice_confusion.csv", toCsv([["Observé \\ Prédit", ...names], ...v.result.confusion.map((r, i) => [names[i], ...r])]))}><Download className="mr-1 h-3 w-3" />CSV</Button>}>
                <table className="stat-num w-full text-xs"><thead><tr><th className="p-1 text-left font-sans">Obs. \ Préd.</th>{names.map((n) => <th key={n} className="p-1 text-right font-sans">{n}</th>)}</tr></thead>
                  <tbody>{v.result.confusion.map((r, i) => <tr key={i} className="border-t border-border"><td className="p-1 font-sans">{names[i]}</td>{r.map((x, j) => <td key={j} className={`p-1 text-right ${i === j ? "bg-secondary font-semibold" : ""}`}>{x.toLocaleString("fr-FR")}</td>)}</tr>)}</tbody></table>
              </Panel>
              <Panel title="Métriques par classe">
                <table className="stat-num w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left font-sans">Classe</th><th className="text-right">Producteur</th><th className="text-right">Utilisateur</th><th className="text-right">F1</th></tr></thead>
                  <tbody>{v.result.perClass.map((c, i) => <tr key={c.code} className="border-t border-border"><td className="py-1 font-sans">{names[i]}</td><td className="text-right">{fmtPct(c.producer)}</td><td className="text-right">{fmtPct(c.user)}</td><td className="text-right">{c.f1.toFixed(3)}</td></tr>)}</tbody></table>
              </Panel>
            </div>
            <Notice tone="info" title="Limites">Le Kappa est sensible à la distribution des classes ; les mesures de désaccord de quantité et d'allocation (Pontius) ne sont pas encore implémentées. Une validation n'a de sens que si la carte prédite n'a pas servi à la calibration.</Notice>
          </>
        ) : <p className="text-sm text-muted-foreground">Aucune validation effectuée. Le modèle n'est pas déclaré validé.</p>}
      </div>
    </div>
  );
}
