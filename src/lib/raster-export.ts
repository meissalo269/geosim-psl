import { writeArrayBuffer } from "geotiff";
import { download } from "./analysis";
import type { RasterData } from "./raster";
import type { LulcClass } from "./store";

export function rasterGeoTiff(r: RasterData): ArrayBuffer {
  if (!r.epsg) throw new Error("CRS inconnu : export géoréférencé impossible.");
  const geographic = r.epsg === 4326;
  return writeArrayBuffer(r.data, {
    width: r.width, height: r.height, BitsPerSample: [32], SampleFormat: [2],
    SamplesPerPixel: [1], PhotometricInterpretation: 1,
    ModelPixelScale: [r.resX, r.resY, 0], ModelTiepoint: [0, 0, 0, r.originX, r.originY, 0],
    GTModelTypeGeoKey: geographic ? 2 : 1, GTRasterTypeGeoKey: 1,
    ...(geographic ? { GeographicTypeGeoKey: r.epsg } : { ProjectedCSTypeGeoKey: r.epsg, ProjLinearUnitsGeoKey: 9001 }),
    ...(r.nodata !== null ? { GDAL_NODATA: String(r.nodata) } : {}),
  });
}

export function exportGeoTiff(r: RasterData, filename: string) {
  download(filename, new Blob([rasterGeoTiff(r)], { type: "image/tiff" }));
}

export async function exportMapPng(url: string, classes: LulcClass[], title: string, filename: string, demo: boolean) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  const mapHeight = Math.round(1120 * image.height / image.width);
  canvas.height = mapHeight + 180 + classes.length * 30;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Export image indisponible.");
  const styles = getComputedStyle(document.documentElement);
  ctx.fillStyle = styles.getPropertyValue("--card").trim();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = styles.getPropertyValue("--foreground").trim();
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(title, 40, 40, 1120);
  ctx.font = "18px sans-serif";
  ctx.fillText(demo ? "FICTIF — données synthétiques, aucune valeur scientifique" : "Scénario simulé — non validé indépendamment", 40, 72);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 40, 100, 1120, mapHeight);
  classes.forEach((c, i) => {
    ctx.fillStyle = c.color;
    ctx.fillRect(40, mapHeight + 130 + i * 30, 20, 20);
    ctx.fillStyle = styles.getPropertyValue("--foreground").trim();
    ctx.fillText(`${c.code} · ${c.name}`, 75, mapHeight + 147 + i * 30);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Export PNG impossible.");
  download(filename, blob);
}