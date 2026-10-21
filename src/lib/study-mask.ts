import proj4 from "proj4";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { finalize, SUPPORTED_EPSG, type RasterData } from "./raster";

/** Pixel-centre inclusion; holes and multipart boundaries follow GeoJSON topology. */
export function maskStudyArea(r: RasterData, area: GeoJSON.Polygon | GeoJSON.MultiPolygon): RasterData {
  if (!r.epsg || !SUPPORTED_EPSG.includes(r.epsg)) throw new Error("CRS non pris en charge pour le masque.");
  let nodata = r.nodata ?? -9999;
  const values = new Set(r.data);
  if (r.nodata === null) while (values.has(nodata)) nodata--;
  const transform = proj4(`EPSG:${r.epsg}`, "EPSG:4326");
  const data = r.data.slice();
  let kept = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const k = y * r.width + x;
    const xy = transform.forward([r.originX + (x + 0.5) * r.resX, r.originY - (y + 0.5) * r.resY]);
    if (!booleanPointInPolygon(xy, area)) data[k] = nodata;
    else if (data[k] !== nodata) kept++;
  }
  if (!kept) throw new Error("La zone d’étude ne recouvre aucun pixel valide.");
  return finalize({ ...r, data, nodata });
}