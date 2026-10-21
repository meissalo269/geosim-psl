import { checkCompatibility, pixelAreaRow, type RasterData } from "./raster";

export interface ChangeResult {
  codes: number[];
  /** area matrix in hectares [from][to] */
  matrix: number[][];
  areaStart: number[];
  areaEnd: number[];
  changed: number;
  stable: number;
  total: number;
  /** per-pixel code: 0 nodata, 1 stable, 2 changed */
  changeMap: Uint8Array;
  /** per-pixel transition index (from*n+to+1), 0 nodata */
  transitionMap: Uint16Array;
}

const isND = (r: RasterData, v: number) => r.nodata !== null && v === r.nodata;

export function computeChange(a: RasterData, b: RasterData, codes: number[]): ChangeResult {
  assertInputs(a, b, codes);
  const n = codes.length;
  const idx = new Map(codes.map((c, i) => [c, i]));
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  const changeMap = new Uint8Array(a.data.length);
  const transitionMap = new Uint16Array(a.data.length);
  for (let row = 0; row < a.height; row++) {
    const ha = pixelAreaRow(a, row) / 10000;
    for (let col = 0; col < a.width; col++) {
      const k = row * a.width + col;
      const va = a.data[k], vb = b.data[k];
      if (isND(a, va) || isND(b, vb)) continue;
      const i = idx.get(va), j = idx.get(vb);
      if (i === undefined || j === undefined) continue;
      matrix[i][j] += ha;
      changeMap[k] = i === j ? 1 : 2;
      transitionMap[k] = i * n + j + 1;
    }
  }
  const areaStart = matrix.map((r) => r.reduce((s, x) => s + x, 0));
  const areaEnd = codes.map((_, j) => matrix.reduce((s, r) => s + r[j], 0));
  const stable = matrix.reduce((s, r, i) => s + r[i], 0);
  const total = areaStart.reduce((s, x) => s + x, 0);
  return { codes, matrix, areaStart, areaEnd, stable, changed: total - stable, total, changeMap, transitionMap };
}

export function transitionProbabilities(matrix: number[][]): number[][] {
  return matrix.map((r, i) => {
    const s = r.reduce((a, b) => a + b, 0);
    return r.map((x, j) => (s > 0 ? x / s : i === j ? 1 : 0));
  });
}

export function stepMarkov(v: number[], P: number[][]): number[] {
  return v.map((_, j) => v.reduce((s, vi, i) => s + vi * P[i][j], 0));
}

/**
 * Markov projection of class areas. `steps` may be fractional: whole steps use P^k,
 * the remaining fraction is linearly interpolated between P^k and P^(k+1).
 */
export function projectMarkov(start: number[], P: number[][], steps: number): number[] {
  if (!Number.isFinite(steps) || steps < 0 || steps > 100) throw new Error("Le nombre de pas doit être compris entre 0 et 100.");
  const k = Math.floor(steps);
  let v = start.slice();
  for (let i = 0; i < k; i++) v = stepMarkov(v, P);
  const f = steps - k;
  if (f > 1e-9) {
    const next = stepMarkov(v, P);
    v = v.map((x, i) => x + f * (next[i] - x));
  }
  return v;
}

export interface ValidationResult {
  codes: number[];
  confusion: number[][]; // [observed][predicted] pixel counts
  overall: number;
  kappa: number;
  perClass: { code: number; producer: number; user: number; f1: number }[];
  n: number;
}

export function computeValidation(observed: RasterData, predicted: RasterData, codes: number[]): ValidationResult {
  assertInputs(observed, predicted, codes);
  const k = codes.length;
  const idx = new Map(codes.map((c, i) => [c, i]));
  const cm = Array.from({ length: k }, () => new Array(k).fill(0));
  let n = 0;
  for (let p = 0; p < observed.data.length; p++) {
    const o = observed.data[p], q = predicted.data[p];
    if (isND(observed, o) || isND(predicted, q)) continue;
    const i = idx.get(o), j = idx.get(q);
    if (i === undefined || j === undefined) continue;
    cm[i][j]++;
    n++;
  }
  const diag = cm.reduce((s, r, i) => s + r[i], 0);
  const overall = n ? diag / n : 0;
  const rowS = cm.map((r) => r.reduce((a, b) => a + b, 0));
  const colS = codes.map((_, j) => cm.reduce((s, r) => s + r[j], 0));
  const pe = n ? rowS.reduce((s, r, i) => s + r * colS[i], 0) / (n * n) : 0;
  const kappa = pe < 1 ? (overall - pe) / (1 - pe) : Number.NaN;
  const perClass = codes.map((code, i) => {
    const producer = rowS[i] ? cm[i][i] / rowS[i] : 0;
    const user = colS[i] ? cm[i][i] / colS[i] : 0;
    const f1 = producer + user ? (2 * producer * user) / (producer + user) : 0;
    return { code, producer, user, f1 };
  });
  return { codes, confusion: cm, overall, kappa, perClass, n };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => (typeof c === "string" && /[;,"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(";")).join("\n");
}

export function download(name: string, content: string | Blob, type = "text/csv;charset=utf-8") {
  const blob = typeof content === "string" ? new Blob(["\ufeff" + content], { type }) : content;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Area (ha) per pixel value, honouring NoData and geographic CRS. */
export function classAreas(r: RasterData): Map<number, number> {
  const m = new Map<number, number>();
  for (let row = 0; row < r.height; row++) {
    const ha = pixelAreaRow(r, row) / 10000;
    for (let col = 0; col < r.width; col++) {
      const v = r.data[row * r.width + col];
      if (isND(r, v)) continue;
      m.set(v, (m.get(v) ?? 0) + ha);
    }
  }
  return m;
}

export function exportMatrixCsv(names: string[], matrix: number[][], file: string) {
  const rows: (string | number)[][] = [["De \\ Vers (ha)", ...names, "Total"]];
  matrix.forEach((r, i) => rows.push([names[i], ...r.map((x) => x.toFixed(2)), r.reduce((a, b) => a + b, 0).toFixed(2)]));
  download(file, toCsv(rows));
}

function assertInputs(a: RasterData, b: RasterData, codes: number[]) {
  const errors = checkCompatibility(a, b).filter((issue) => issue.level === "error");
  if (errors.length) throw new Error(errors.map((issue) => issue.message).join(" "));
  if (!codes.length || new Set(codes).size !== codes.length || codes.some((c) => !Number.isInteger(c))) throw new Error("La légende doit contenir des codes entiers uniques.");
}
