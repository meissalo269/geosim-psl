import { create } from "zustand";
import { finalize, type RasterData } from "./raster";

export interface LulcClass { code: number; name: string; color: string }

export interface Dataset {
  id: string;
  name: string;
  format: string;
  kind: "raster" | "vecteur";
  size: number;
  year: number | null;
  raster?: RasterData;
  geojson?: GeoJSON.GeoJsonObject;
  featureCount?: number;
  status: "valide" | "avertissement" | "erreur";
  messages: string[];
  demo?: boolean;
  isReference?: boolean;
  isStudyArea?: boolean;
  isPrediction?: boolean;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  type: "Import" | "Analyse diachronique" | "Simulation Markov" | "Validation" | "Export";
  label: string;
  status: "terminé" | "erreur" | "en attente" | "en cours";
  date: string;
  details?: Record<string, unknown>;
}

interface State {
  datasets: Dataset[];
  classes: LulcClass[];
  years: number[];
  history: HistoryEntry[];
  addDataset: (d: Dataset) => void;
  updateDataset: (id: string, patch: Partial<Dataset>) => void;
  removeDataset: (id: string) => void;
  setClasses: (c: LulcClass[]) => void;
  addYear: (y: number) => void;
  log: (e: Omit<HistoryEntry, "id" | "date">) => void;
  loadDemo: () => void;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const useGeo = create<State>((set, get) => ({
  datasets: [],
  classes: [
    { code: 1, name: "Surfaces artificialisées", color: "#d64545" },
    { code: 2, name: "Végétation", color: "#3f9b4f" },
    { code: 3, name: "Eau et zones humides", color: "#2f7fc1" },
    { code: 4, name: "Sols nus", color: "#d9c27a" },
  ],
  years: [2018, 2021, 2024],
  history: [],
  addDataset: (d) => set((s) => ({ datasets: [...s.datasets, d], years: d.year ? [...new Set([...s.years, d.year])].sort() : s.years })),
  updateDataset: (id, patch) => set((s) => ({ datasets: s.datasets.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeDataset: (id) => set((s) => ({ datasets: s.datasets.filter((d) => d.id !== id) })),
  setClasses: (classes) => set({ classes }),
  addYear: (y) => set((s) => ({ years: [...new Set([...s.years, y])].sort() })),
  log: (e) => set((s) => ({ history: [{ ...e, id: uid(), date: new Date().toISOString() }, ...s.history] })),
  loadDemo: () => {
    const demos = makeDemo();
    set((s) => ({ datasets: [...s.datasets.filter((d) => !d.demo), ...demos] }));
    get().log({ type: "Import", label: "Jeu de démonstration FICTIF chargé (3 rasters)", status: "terminé" });
  },
}));

/** Synthetic rasters — FICTITIOUS, for interface demonstration only. */
function makeDemo(): Dataset[] {
  const W = 160, H = 120, res = 60;
  const originX = 830000, originY = 6262000; // Lambert-93 near Port-Saint-Louis-du-Rhône
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = new Int32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const coast = y > H * 0.7 + Math.sin(x / 12) * 6;
      const river = Math.abs(x - 40 - Math.sin(y / 15) * 8) < 4;
      const town = Math.hypot(x - 70, y - 50) < 14;
      base[y * W + x] = coast || river ? 3 : town ? 1 : rnd() < 0.25 ? 4 : 2;
    }
  const grow = (prev: Int32Array, r: number) => {
    const out = prev.slice();
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x;
        if (prev[k] === 1 || prev[k] === 3) continue;
        const nb = [prev[k - 1], prev[k + 1], prev[k - W], prev[k + W]].filter((v) => v === 1).length;
        if (nb > 0 && rnd() < r * nb) out[k] = 1;
        else if (prev[k] === 2 && rnd() < 0.02) out[k] = 4;
        else if (prev[k] === 4 && rnd() < 0.05) out[k] = 2;
      }
    return out;
  };
  const r21 = grow(base, 0.12), r24 = grow(r21, 0.12);
  return ([[2018, base], [2021, r21], [2024, r24]] as const).map(([year, data], i) => ({
    id: `demo-${year}`,
    name: `DEMO_FICTIF_occsol_${year}.tif`,
    format: "GeoTIFF (synthétique)",
    kind: "raster" as const,
    size: data.byteLength,
    year,
    raster: finalize({ width: W, height: H, data, nodata: 0, epsg: 2154, originX, originY, resX: res, resY: res, geographic: false }),
    status: "avertissement" as const,
    messages: ["Données synthétiques FICTIVES générées pour la démonstration. Aucune valeur scientifique."],
    demo: true,
    isReference: i === 0,
    createdAt: new Date().toISOString(),
  }));
}
