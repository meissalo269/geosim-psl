import proj4 from "proj4";

proj4.defs("EPSG:2154", "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
proj4.defs("EPSG:32631", "+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:32632", "+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs");

export interface RasterData {
  width: number;
  height: number;
  data: Int32Array;
  nodata: number | null;
  epsg: number | null;
  /** top-left origin */
  originX: number;
  originY: number;
  resX: number;
  resY: number; // positive
  geographic: boolean;
  uniques: { value: number; count: number }[];
}

export const SUPPORTED_EPSG = [4326, 2154, 32631, 32632, 3857];

export async function parseGeoTiff(buf: ArrayBuffer): Promise<RasterData> {
  const { fromArrayBuffer } = await import("geotiff");
  const tiff = await fromArrayBuffer(buf);
  const img = await tiff.getImage();
  const width = img.getWidth();
  const height = img.getHeight();
  if (width * height > 25_000_000) {
    throw new Error(
      `Raster trop volumineux pour le navigateur (${width}×${height}). Ce fichier nécessite le moteur Python (non configuré).`,
    );
  }
  const [originX, originY] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  if (![originX, originY, rx, ry].every(Number.isFinite) || rx <= 0 || ry >= 0 || "ModelTransformation" in img.getFileDirectory()) {
    throw new Error("Géoréférencement non pris en charge : une grille nord en haut sans rotation est requise. Réalignez le raster avant import.");
  }
  const geoKeys = img.getGeoKeys() ?? {};
  const epsg: number | null =
    (geoKeys.ProjectedCSTypeGeoKey as number) || (geoKeys.GeographicTypeGeoKey as number) || null;
  const geographic = !geoKeys.ProjectedCSTypeGeoKey && !!geoKeys.GeographicTypeGeoKey;
  const nd = img.getGDALNoData();
  const rasters = await img.readRasters({ samples: [0], interleave: true });
  const src = rasters as unknown as ArrayLike<number>;
  const data = new Int32Array(width * height);
  if (nd !== null && nd !== undefined && (!Number.isInteger(nd) || nd < -2147483648 || nd > 2147483647)) throw new Error("NoData doit être un entier signé sur 32 bits.");
  for (let i = 0; i < data.length; i++) {
    const v = src[i];
    if (!Number.isInteger(v) || v < -2147483648 || v > 2147483647) throw new Error("Raster non catégoriel : chaque pixel doit être un code entier signé sur 32 bits.");
    data[i] = v;
  }
  return finalize({
    width, height, data, nodata: nd ?? null, epsg, originX, originY,
    resX: Math.abs(rx), resY: Math.abs(ry), geographic,
  });
}

export function finalize(r: Omit<RasterData, "uniques">): RasterData {
  const counts = new Map<number, number>();
  for (let i = 0; i < r.data.length; i++) {
    const v = r.data[i];
    if (r.nodata !== null && v === r.nodata) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const uniques = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value - b.value);
  return { ...r, uniques: uniques.length > 256 ? uniques.slice(0, 256) : uniques };
}

export function extent(r: RasterData) {
  return {
    minX: r.originX,
    maxX: r.originX + r.width * r.resX,
    maxY: r.originY,
    minY: r.originY - r.height * r.resY,
  };
}

/** Bounds in WGS84 [[south, west], [north, east]] or null if CRS unknown */
export function wgs84Bounds(r: RasterData): [[number, number], [number, number]] | null {
  const e = extent(r);
  if (r.geographic || r.epsg === 4326) return [[e.minY, e.minX], [e.maxY, e.maxX]];
  if (!r.epsg || !SUPPORTED_EPSG.includes(r.epsg)) return null;
  const code = `EPSG:${r.epsg}`;
  const pts = [[e.minX, e.minY], [e.maxX, e.maxY], [e.minX, e.maxY], [e.maxX, e.minY]].map((p) => proj4(code, "EPSG:4326", p));
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
}

const R = 6371008.8;
/** Area (m²) of one pixel in row `row`. Geographic rasters use a spherical cell-area formula. */
export function pixelAreaRow(r: RasterData, row: number): number {
  if (!r.geographic && r.epsg !== 4326) return r.resX * r.resY;
  const lat1 = ((r.originY - row * r.resY) * Math.PI) / 180;
  const lat2 = ((r.originY - (row + 1) * r.resY) * Math.PI) / 180;
  return R * R * ((r.resX * Math.PI) / 180) * Math.abs(Math.sin(lat1) - Math.sin(lat2));
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function renderToDataUrl(r: RasterData, colorOf: (v: number) => string | null): string {
  const c = document.createElement("canvas");
  c.width = r.width;
  c.height = r.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Le navigateur ne permet pas de dessiner le raster.");
  const img = ctx.createImageData(r.width, r.height);
  const cache = new Map<number, [number, number, number] | null>();
  for (let i = 0; i < r.data.length; i++) {
    const v = r.data[i];
    if (r.nodata !== null && v === r.nodata) continue;
    let rgb = cache.get(v);
    if (rgb === undefined) {
      const hex = colorOf(v);
      rgb = hex ? hexToRgb(hex) : null;
      cache.set(v, rgb);
    }
    if (!rgb) continue;
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export interface CompatIssue { level: "error" | "warning"; message: string }

export function checkCompatibility(a: RasterData, b: RasterData): CompatIssue[] {
  const issues: CompatIssue[] = [];
  if (a.epsg !== b.epsg) issues.push({ level: "error", message: `CRS différents (EPSG:${a.epsg ?? "?"} vs EPSG:${b.epsg ?? "?"}). Reprojection requise par le moteur de traitement.` });
  if (a.width !== b.width || a.height !== b.height) issues.push({ level: "error", message: `Dimensions différentes (${a.width}×${a.height} vs ${b.width}×${b.height}).` });
  const tol = Math.min(a.resX, b.resX) * 1e-6;
  if (Math.abs(a.resX - b.resX) > tol || Math.abs(a.resY - b.resY) > tol) issues.push({ level: "error", message: `Résolutions différentes (${a.resX} vs ${b.resX}). Rééchantillonnage au plus proche voisin requis.` });
  if (Math.abs(a.originX - b.originX) > tol || Math.abs(a.originY - b.originY) > tol) issues.push({ level: "error", message: "Emprises/origines non alignées." });
  if (a.nodata !== b.nodata) issues.push({ level: "warning", message: `Valeurs NoData différentes (${a.nodata} vs ${b.nodata}). Les deux seront exclues.` });
  if (!a.epsg || !b.epsg) issues.push({ level: "error", message: "Géoréférencement incomplet : CRS non détecté, comparaison impossible." });
  return issues;
}
