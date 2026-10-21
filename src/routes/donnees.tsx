import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge, Notice, PageHeader, Panel, useRasters } from "@/components/geo/ui";
import { checkCompatibility, extent, parseGeoTiff } from "@/lib/raster";
import { uid, useGeo, type Dataset } from "@/lib/store";

export const Route = createFileRoute("/donnees")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Données géospatiales — GeoSim PSL" },
      { name: "description", content: "Import et vérification des rasters GeoTIFF et couches GeoJSON : CRS, emprise, résolution, NoData." },
      { property: "og:title", content: "Données géospatiales — GeoSim PSL" },
      { property: "og:description", content: "Importer et contrôler les cartes d'occupation du sol." },
    ],
  }),
  component: DataPage,
});

const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${(b / 1e3).toFixed(0)} ko`);

function DataPage() {
  const { datasets, addDataset, updateDataset, removeDataset, years, classes, log, loadDemo } = useGeo();
  const rasters = useRasters();
  const [busy, setBusy] = useState(false);
  const ref = rasters.find((r) => r.isReference) ?? rasters[0];

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const base: Omit<Dataset, "kind" | "format" | "status" | "messages"> = { id: uid(), name: f.name, size: f.size, year: guessYear(f.name), createdAt: new Date().toISOString() };
      try {
        if (ext === "tif" || ext === "tiff") {
          const raster = await parseGeoTiff(await f.arrayBuffer());
          const msgs: string[] = [];
          let status: Dataset["status"] = "valide";
          if (!raster.epsg) { status = "avertissement"; msgs.push("CRS non détecté dans les GeoKeys."); }
          if (raster.nodata === null) { status = "avertissement"; msgs.push("Aucune valeur NoData déclarée."); }
          const known = new Set(classes.map((c) => c.code));
          const unknown = raster.uniques.filter((u) => !known.has(u.value)).map((u) => u.value);
          if (unknown.length) { status = "avertissement"; msgs.push(`Valeurs hors légende : ${unknown.slice(0, 10).join(", ")}${unknown.length > 10 ? "…" : ""}. Vérifiez la légende.`); }
          addDataset({ ...base, kind: "raster", format: "GeoTIFF", raster, status, messages: msgs });
        } else if (ext === "geojson" || ext === "json") {
          const gj = JSON.parse(await f.text());
          if (!isGeoJson(gj)) throw new Error("GeoJSON invalide : géométries et coordonnées WGS84 requises.");
          const n = gj.features?.length ?? 1;
          addDataset({ ...base, kind: "vecteur", format: "GeoJSON", geojson: gj, featureCount: n, status: "valide", messages: ["CRS supposé WGS84 (RFC 7946)."] });
        } else if (ext === "zip" || ext === "csv") {
          addDataset({ ...base, kind: "vecteur", format: ext === "zip" ? "Shapefile (ZIP)" : "CSV", status: "erreur", messages: ["Conversion non prise en charge dans le navigateur : nécessite le moteur Python (GeoPandas), non configuré."] });
          log({ type: "Import", label: `Conversion indisponible : ${f.name}`, status: "erreur" });
          continue;
        } else {
          throw new Error("Format non reconnu.");
        }
        log({ type: "Import", label: `Import de ${f.name}`, status: "terminé" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${f.name} : ${msg}`);
        log({ type: "Import", label: `Échec import ${f.name} : ${msg}`, status: "erreur" });
      }
    }
    setBusy(false);
  }

  return (
    <div>
      <PageHeader title="Données géospatiales" subtitle="Import local, lecture des métadonnées et contrôle de compatibilité. Les fichiers restent dans votre navigateur pendant la session." />
      <div className="space-y-6 p-6">
        <Panel title="Importer">
          <label className="grid-paper flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-border p-8 text-center hover:border-sky">
            <Upload className="h-7 w-7 text-sky" />
            <span className="font-medium text-primary">{busy ? "Lecture en cours…" : "Déposer ou choisir des fichiers"}</span>
            <span className="text-xs text-muted-foreground">GeoTIFF classifié (.tif, .tiff) · GeoJSON (.geojson, .json) · Shapefile ZIP et CSV : moteur Python requis</span>
            <input type="file" multiple disabled={busy} className="hidden" accept=".tif,.tiff,.geojson,.json,.zip,.csv" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={loadDemo}>Charger le jeu de démonstration (fictif)</Button></div>
        </Panel>

        {datasets.length > 0 && (
          <Panel title={`Jeux de données (${datasets.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3">Nom</th><th className="pr-3">Type</th><th className="pr-3">CRS</th><th className="pr-3">Dimensions / résolution</th><th className="pr-3">Emprise</th><th className="pr-3">Valeurs</th><th className="pr-3">Taille</th><th className="pr-3">Année</th><th className="pr-3">Rôle</th><th className="pr-3">État</th><th />
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => {
                    const r = d.raster;
                    const e = r && extent(r);
                    return (
                      <tr key={d.id} className="border-b border-border align-top">
                        <td className="py-2 pr-3 font-medium">{d.name} {d.demo && <DemoBadge />}<div className="text-xs font-normal text-muted-foreground">{d.format}</div></td>
                        <td className="pr-3">{d.kind}</td>
                        <td className="stat-num pr-3">{r ? (r.epsg ? `EPSG:${r.epsg}` : "?") : d.geojson ? "EPSG:4326" : "—"}</td>
                        <td className="stat-num pr-3 text-xs">{r ? <>{r.width}×{r.height}<br />{r.resX.toPrecision(4)} {r.geographic ? "°" : "m"} · ND={String(r.nodata)}</> : d.featureCount ? `${d.featureCount} entités` : "—"}</td>
                        <td className="stat-num pr-3 text-xs">{e ? <>{e.minX.toFixed(0)}, {e.minY.toFixed(0)}<br />{e.maxX.toFixed(0)}, {e.maxY.toFixed(0)}</> : "—"}</td>
                        <td className="stat-num pr-3 text-xs">{r ? r.uniques.map((u) => u.value).join(", ") : "—"}</td>
                        <td className="pr-3 text-xs">{fmtSize(d.size)}</td>
                        <td className="pr-3">
                          {d.kind === "raster" && (
                            <select className="h-8 rounded border border-input bg-card px-1 text-sm" value={d.year ?? ""} onChange={(e) => updateDataset(d.id, { year: e.target.value ? Number(e.target.value) : null })}>
                              <option value="">—</option>{years.map((y) => <option key={y}>{y}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="pr-3 text-xs">
                          {d.kind === "raster" ? (
                            <label className="flex items-center gap-1"><input type="radio" name="ref" checked={ref?.id === d.id} onChange={() => datasets.forEach((x) => updateDataset(x.id, { isReference: x.id === d.id }))} />Référence</label>
                          ) : d.geojson ? (
                            <label className="flex items-center gap-1"><input type="checkbox" checked={!!d.isStudyArea} onChange={(e) => updateDataset(d.id, { isStudyArea: e.target.checked })} />Zone d'étude</label>
                          ) : null}
                        </td>
                        <td className="pr-3 text-xs">
                          <span className={d.status === "valide" ? "text-accent" : d.status === "erreur" ? "text-destructive" : "text-warning-foreground"}>● {d.status}</span>
                          {d.messages.map((m, i) => <div key={i} className="mt-1 max-w-xs text-muted-foreground">{m}</div>)}
                        </td>
                        <td><Button variant="ghost" size="icon" onClick={() => removeDataset(d.id)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {rasters.length > 1 && ref && (
          <Panel title={`Compatibilité avec le raster de référence (${ref.name})`}>
            <div className="space-y-3">
              {rasters.filter((r) => r.id !== ref.id).map((r) => {
                const issues = checkCompatibility(ref.raster, r.raster);
                return issues.length === 0 ? (
                  <Notice key={r.id} tone="info" title={`${r.name} : compatible`}>Même CRS, dimensions, résolution et origine.</Notice>
                ) : (
                  <Notice key={r.id} tone={issues.some((i) => i.level === "error") ? "error" : "warning"} title={`${r.name} : ${issues.length} problème(s)`}>
                    <ul className="list-disc pl-4">{issues.map((i, k) => <li key={k}>{i.message}</li>)}</ul>
                    <p className="mt-1">Aucun alignement automatique n'est effectué. Alignement requis via le moteur Python — méthode recommandée pour des rasters catégoriels : plus proche voisin.</p>
                  </Notice>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function guessYear(name: string): number | null {
  const m = name.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function isGeoJson(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v["type"] === "FeatureCollection") return Array.isArray(v["features"]) && v["features"].every((f) => !!f && typeof f === "object" && (f as Record<string, unknown>)["type"] === "Feature" && isGeoJson(f));
  if (v["type"] === "Feature") return v["geometry"] === null || isGeoJson(v["geometry"]);
  if (v["type"] === "GeometryCollection") return Array.isArray(v["geometries"]) && v["geometries"].every(isGeoJson);
  const position = (c: unknown): boolean => Array.isArray(c) && c.length >= 2 && c.every((x) => typeof x === "number" && Number.isFinite(x)) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90;
  const line = (c: unknown): boolean => Array.isArray(c) && c.length >= 2 && c.every(position);
  const ring = (c: unknown): boolean => Array.isArray(c) && c.length >= 4 && c.every(position) && JSON.stringify(c[0]) === JSON.stringify(c[c.length - 1]);
  const polygon = (c: unknown): boolean => Array.isArray(c) && c.length > 0 && c.every(ring);
  switch (v["type"]) {
    case "Point": return position(v["coordinates"]);
    case "MultiPoint": return Array.isArray(v["coordinates"]) && v["coordinates"].every(position);
    case "LineString": return line(v["coordinates"]);
    case "MultiLineString": return Array.isArray(v["coordinates"]) && v["coordinates"].every(line);
    case "Polygon": return polygon(v["coordinates"]);
    case "MultiPolygon": return Array.isArray(v["coordinates"]) && v["coordinates"].every(polygon);
    default: return false;
  }
}
