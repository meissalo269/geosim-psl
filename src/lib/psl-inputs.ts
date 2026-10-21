import r18 from "@/assets/psl-2018.asset.json";
import r21 from "@/assets/psl-2021.asset.json";
import r24 from "@/assets/psl-2024.asset.json";
import boundary from "@/assets/psl-boundary.asset.json";
import { parseGeoTiff } from "./raster";
import type { Dataset } from "./store";

export const pslInputs = [{ year: 2018, asset: r18 }, { year: 2021, asset: r21 }, { year: 2024, asset: r24 }];

export async function loadPslInputs(): Promise<Dataset[]> {
  const createdAt = new Date().toISOString();
  const rasters = await Promise.all(pslInputs.map(async ({ year, asset }): Promise<Dataset> => {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Carte ${year} indisponible (${response.status}).`);
    const raster = await parseGeoTiff(await response.arrayBuffer());
    return { id: `psl-real-${year}`, name: asset.original_filename, year, raster, size: asset.size, kind: "raster", format: "GeoTIFF", status: "valide", messages: ["Classification TerrSet / Random Forest fournie par Meïssa Lo. Fond exclu selon psl.zip ; inclusion au centre du pixel. Entraînement CORINE 2018 : non indépendant pour la validation."], isReference: year === 2018, createdAt };
  }));
  const response = await fetch(boundary.url);
  if (!response.ok) throw new Error("Limite PSL indisponible.");
  const geojson = await response.json() as GeoJSON.FeatureCollection;
  return [...rasters, { id: "psl-real-boundary", name: "Zone d’étude PSL", kind: "vecteur", format: "GeoJSON (depuis psl.zip)", size: boundary.size, year: null, geojson, featureCount: geojson.features.length, isStudyArea: true, status: "valide", messages: ["Limite WGS84 fournie par Meïssa Lo."], createdAt }];
}