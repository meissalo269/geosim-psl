import { describe, expect, it } from "vitest";
import { computeChange, computeValidation, projectMarkov } from "./analysis";
import { finalize } from "./raster";

const r = (data: number[]) => finalize({ width: 2, height: 2, data: Int32Array.from(data), nodata: 0, epsg: 2154, originX: 0, originY: 200, resX: 100, resY: 100, geographic: false });

describe("analysis", () => {
  it("computes transitions in hectares excluding NoData", () => {
    const c = computeChange(r([1, 2, 2, 0]), r([1, 1, 2, 2]), [1, 2]);
    expect(c.matrix).toEqual([[1, 0], [1, 1]]);
    expect(c.changed).toBe(1);
    expect(c.total).toBe(3);
  });
  it("projects Markov areas", () => {
    expect(projectMarkov([10, 0], [[0.5, 0.5], [0, 1]], 2)).toEqual([2.5, 7.5]);
  });
  it("computes overall accuracy", () => {
    expect(computeValidation(r([1, 1, 2, 2]), r([1, 2, 2, 2]), [1, 2]).overall).toBe(0.75);
  });
});
