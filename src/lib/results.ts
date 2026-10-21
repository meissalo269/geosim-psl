import { create } from "zustand";
import type { ChangeResult, ValidationResult } from "./analysis";

export interface ChangeRun { id: string; fromName: string; toName: string; y1: number; y2: number; result: ChangeResult; demo: boolean; date: string }
export interface SimRun {
  id: string; model: string; y1: number; y2: number; target: number; steps: number;
  codes: number[]; P: number[][]; start: number[]; predicted: number[]; warnings: string[]; demo: boolean; date: string;
  backtest?: { year: number; predicted: number[]; observed: number[] };
}
export interface ValRun { id: string; observed: string; predicted: string; year: number | null; result: ValidationResult; demo: boolean; date: string }

interface S {
  change?: ChangeRun; sim?: SimRun; validation?: ValRun;
  setChange: (c: ChangeRun) => void; setSim: (s: SimRun) => void; setValidation: (v: ValRun) => void;
}
export const useResults = create<S>((set) => ({
  setChange: (change) => set({ change }),
  setSim: (sim) => set({ sim }),
  setValidation: (validation) => set({ validation }),
}));
