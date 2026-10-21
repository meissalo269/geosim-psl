import { classAreas, projectMarkov, transitionProbabilities } from "./analysis";
import { finalize, type RasterData } from "./raster";

export type SpatialModel = "markov" | "ca-markov";

/** Seeded stochastic realization, not an independently validated forecast. */
export async function spatialMarkov(
  initial: RasterData, codes: number[], P: number[][], steps: number,
  model: SpatialModel, seed: number, onProgress?: (percent: number) => void,
): Promise<RasterData> {
  if (!Number.isFinite(steps) || steps < 0 || steps > 100) throw new Error("Le nombre de pas doit être compris entre 0 et 100.");
  if (!Number.isInteger(seed) || seed < 1 || seed > 2147483646) throw new Error("La graine doit être un entier entre 1 et 2147483646.");
  if (!codes.length || new Set(codes).size !== codes.length) throw new Error("La légende doit contenir des codes uniques.");
  if (P.length !== codes.length || P.some((row) => row.length !== codes.length || row.some((v) => !Number.isFinite(v) || v < 0) || Math.abs(row.reduce((a, b) => a + b, 0) - 1) > 1e-6)) throw new Error("Matrice de probabilités invalide.");
  const idx = new Map(codes.map((c, i) => [c, i]));
  let data = initial.data.slice();
  let state = seed;
  const random = () => ((state = (state * 16807) % 2147483647) / 2147483647);
  const count = Math.ceil(steps);
  for (let step = 0; step < count; step++) {
    const fraction = Math.min(1, steps - step);
    const next = data.slice();
    for (let p = 0; p < data.length; p++) {
      const value = data[p];
      const from = idx.get(value);
      if (from !== undefined && value !== initial.nodata) {
        const weights = P[from].map((probability, to) => fraction * probability + (to === from ? 1 - fraction : 0));
        if (model === "ca-markov") {
          const row = Math.floor(p / initial.width), col = p % initial.width;
          const neighbors = new Array(codes.length).fill(0);
          let valid = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if ((!dx && !dy) || row + dy < 0 || row + dy >= initial.height || col + dx < 0 || col + dx >= initial.width) continue;
            const v = data[(row + dy) * initial.width + col + dx];
            const j = idx.get(v);
            if (j !== undefined && v !== initial.nodata) { neighbors[j]++; valid++; }
          }
          // Laplace smoothing prevents a missing local class from becoming impossible.
          weights.forEach((w, j) => { weights[j] = w * (1 + (valid ? neighbors[j] / valid : 0)); });
        }
        const total = weights.reduce((a, b) => a + b, 0);
        const draw = random() * total;
        let cumulative = 0;
        for (let j = 0; j < codes.length; j++) {
          cumulative += weights[j];
          if (draw < cumulative) { next[p] = codes[j]; break; }
        }
      }
      if ((p + 1) % 100_000 === 0) {
        onProgress?.(Math.round(100 * (step + (p + 1) / data.length) / count));
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    data = next;
    onProgress?.(Math.round(100 * (step + 1) / count));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return finalize({ ...initial, data });
}

export function expectedAreas(initial: RasterData, codes: number[], matrix: number[][], steps: number) {
  const areas = classAreas(initial);
  return projectMarkov(codes.map((code) => areas.get(code) ?? 0), transitionProbabilities(matrix), steps);
}