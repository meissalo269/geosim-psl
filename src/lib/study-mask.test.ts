import { describe, it, expect } from "vitest";
import { maskStudyArea } from "./study-mask";
import { finalize } from "./raster";

describe("study area mask", () => {
  it("excludes exterior pixels without removing the same classes inside", () => {
    const r = finalize({ width: 4, height: 1, data: Int32Array.from([1, 2, 3, 4]), nodata: null, epsg: 4326, originX: 0, originY: 1, resX: 1, resY: 1, geographic: true });
    const area: GeoJSON.Polygon = { type: "Polygon", coordinates: [[[1, 0], [3, 0], [3, 1], [1, 1], [1, 0]]] };
    const out = maskStudyArea(r, area);
    expect([...out.data]).toEqual([-9999, 2, 3, -9999]);
    expect(out.uniques).toEqual([{ value: 2, count: 1 }, { value: 3, count: 1 }]);
    expect([...r.data]).toEqual([1, 2, 3, 4]);
  });
  it("excludes polygon holes", () => {
    const r = finalize({ width: 1, height: 2, data: Int32Array.from([2, 2]), nodata: null, epsg: 4326, originX: 0, originY: 2, resX: 1, resY: 1, geographic: true });
    const area: GeoJSON.Polygon = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 2], [0, 2], [0, 0]], [[0.1, 1.1], [0.9, 1.1], [0.9, 1.9], [0.1, 1.9], [0.1, 1.1]]] };
    expect([...maskStudyArea(r, area).data]).toEqual([-9999, 2]);
  });
});