import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, Notice, PageHeader, Panel, fmtHa, fmtPct } from "@/components/geo/ui";
import { download, exportMatrixCsv, toCsv } from "@/lib/analysis";
import { useGeo } from "@/lib/store";
import { useResults } from "@/lib/results";

export const Route = createFileRoute("/rapports")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Rapports et exports — GeoSim PSL" },
      { name: "description", content: "Rapport synthétique imprimable en PDF et exports CSV des résultats calculés." },
      { property: "og:title", content: "Rapports et exports — GeoSim PSL" },
      { property: "og:description", content: "Exporter les résultats d'analyse et de simulation." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { classes, datasets, log } = useGeo();
  const { change, sim, validation } = useResults();
  const name = (c: number) => classes.find((k) => k.code === c)?.name ?? String(c);
  const demo = change?.demo || sim?.demo || validation?.demo;
  const none = !change && !sim && !validation;

  return (
    <div>
      <PageHeader title="Rapports et exportations" subtitle="Seuls les résultats réellement calculés pendant la session sont exportables." actions={
        <Button onClick={() => { log({ type: "Export", label: "Rapport PDF", status: "terminé" }); window.print(); }} disabled={none}><Printer className="mr-1 h-4 w-4" />Imprimer / PDF</Button>
      } />
      <div className="space-y-6 p-6">
        <Panel title="Exports disponibles" className="print:hidden">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!change} onClick={() => change && exportMatrixCsv(change.result.codes.map(name), change.result.matrix, "matrice_transition.csv")}><Download className="mr-1 h-4 w-4" />Matrice de transition (CSV)</Button>
            <Button variant="outline" disabled={!sim} onClick={() => sim && download("simulation.csv", toCsv([["Classe", "Initial (ha)", `${sim.target} (ha)`], ...sim.codes.map((c, i) => [name(c), sim.start[i].toFixed(2), sim.predicted[i].toFixed(2)])]))}><Download className="mr-1 h-4 w-4" />Simulation (CSV)</Button>
            <Button variant="outline" disabled={!validation} onClick={() => validation && download("validation.csv", toCsv([["Classe", "Producteur", "Utilisateur", "F1"], ...validation.result.perClass.map((c) => [name(c.code), c.producer.toFixed(4), c.user.toFixed(4), c.f1.toFixed(4)]), ["Précision globale", validation.result.overall.toFixed(4)], ["Kappa", validation.result.kappa.toFixed(4)]]))}><Download className="mr-1 h-4 w-4" />Validation (CSV)</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Export GeoTIFF et Shapefile : nécessite le moteur Python (GDAL), non configuré.</p>
        </Panel>

        {none ? <Notice tone="info" title="Aucun résultat à inclure">Lancez une analyse diachronique, une simulation ou une validation.</Notice> : (
          <article className="mx-auto max-w-3xl space-y-5 rounded-md border border-border bg-card p-8 text-sm print:border-0 print:p-0">
            <header className="border-b border-border pb-4">
              <h2 className="text-xl font-semibold text-primary">Analyse diachronique de l'occupation du sol et simulation prospective par télédétection et SIG : cas de Port-Saint-Louis-du-Rhône</h2>
              <p className="mt-1 text-muted-foreground">Zone d'étude : Port-Saint-Louis-du-Rhône (Bouches-du-Rhône, France) · Généré le {new Date().toLocaleString("fr-FR")}</p>
              {demo && <p className="mt-2 flex items-center gap-2"><DemoBadge /> Ce rapport contient des résultats calculés sur des données fictives.</p>}
            </header>
            <section><h3 className="font-semibold text-primary">Données</h3>
              <ul className="list-disc pl-5">{datasets.filter((d) => d.raster).map((d) => <li key={d.id}>{d.name} — {d.year ?? "année ?"}, EPSG:{d.raster!.epsg ?? "?"}, {d.raster!.width}×{d.raster!.height}, résolution {d.raster!.resX}</li>)}</ul></section>
            {change && <section><h3 className="font-semibold text-primary">Changements {change.y1}–{change.y2}</h3>
              <p>Surface analysée {fmtHa(change.result.total)} ha ; stable {fmtHa(change.result.stable)} ha ; modifiée {fmtHa(change.result.changed)} ha ({fmtPct(change.result.changed / change.result.total)}).</p>
              <table className="stat-num mt-2 w-full text-xs"><thead><tr><th className="text-left font-sans">Classe</th><th className="text-right">{change.y1}</th><th className="text-right">{change.y2}</th><th className="text-right">Net</th></tr></thead>
                <tbody>{change.result.codes.map((c, i) => <tr key={c} className="border-t border-border"><td className="font-sans">{name(c)}</td><td className="text-right">{fmtHa(change.result.areaStart[i])}</td><td className="text-right">{fmtHa(change.result.areaEnd[i])}</td><td className="text-right">{fmtHa(change.result.areaEnd[i] - change.result.areaStart[i])}</td></tr>)}</tbody></table></section>}
            {sim && <section><h3 className="font-semibold text-primary">Simulation {sim.target}</h3>
              <p>Modèle : {sim.model}. Calibration {sim.y1}–{sim.y2}, {sim.steps.toFixed(2)} pas.</p>
              <ul className="list-disc pl-5">{sim.codes.map((c, i) => <li key={c}>{name(c)} : {fmtHa(sim.predicted[i])} ha</li>)}</ul></section>}
            {validation && <section><h3 className="font-semibold text-primary">Validation</h3><p>{validation.predicted} vs {validation.observed} : précision globale {fmtPct(validation.result.overall)}, Kappa {validation.result.kappa.toFixed(3)}.</p></section>}
            {!validation && <p>Aucune validation indépendante : le modèle n'est pas validé.</p>}
            <section><h3 className="font-semibold text-primary">Limites méthodologiques</h3>
              <p>La chaîne de Markov suppose des probabilités de transition stationnaires et ne spatialise pas les changements. Les résultats dépendent de la qualité des classifications d'entrée. Les projections éloignées de la période d'observation sont des scénarios tendanciels.</p></section>
          </article>
        )}
      </div>
    </div>
  );
}
