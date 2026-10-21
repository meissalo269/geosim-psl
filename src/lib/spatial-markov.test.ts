import { describe, it, expect } from "vitest";
import { fromArrayBuffer } from "geotiff";
import { spatialMarkov } from "./spatial-markov";
import { rasterGeoTiff } from "./raster-export";
import { finalize, parseGeoTiff } from "./raster";
import { projectMarkov, transitionProbabilities, computeChange } from "./analysis";
const r = finalize({width:2,height:2,data:Int32Array.from([1,2,1,-9999]),nodata:-9999,epsg:2154,originX:800000,originY:6250000,resX:10,resY:10,geographic:false});
describe("Markov raster", () => {
 it("preserves area when a class has no historical transitions", () => { const P=transitionProbabilities([[5,5],[0,0]]); expect(P[1]).toEqual([0,1]); expect(projectMarkov([10,20],P,1)).toEqual([5,25]); });
 it.each(["markov","ca-markov"] as const)("%s produces categorical cells and preserves NoData",async model=>{const out=await spatialMarkov(r,[1,2],[[0,1],[1,0]],1,model,42);expect([...out.data]).toEqual([2,1,2,-9999]);expect(out.epsg).toBe(2154);});
 it("is reproducible with the same seed",async()=>{const a=await spatialMarkov(r,[1,2],[[0.5,0.5],[0.5,0.5]],2,"markov",42);const b=await spatialMarkov(r,[1,2],[[0.5,0.5],[0.5,0.5]],2,"markov",42);expect([...a.data]).toEqual([...b.data]);});
 it("rejects invalid steps",async()=>{await expect(spatialMarkov(r,[1,2],[[1,0],[0,1]],NaN,"markov",42)).rejects.toThrow();});
 it("rejects subpixel misalignment",()=>{expect(()=>computeChange(r,{...r,originX:r.originX+1},[1,2])).toThrow("alignées");});
 it("exports signed cells and reads georeferencing back",async()=>{const buffer=rasterGeoTiff(r);const tiff=await fromArrayBuffer(buffer);const img=await tiff.getImage();expect(img.getGDALNoData()).toBe(-9999);const out=await parseGeoTiff(buffer);expect([...out.data]).toEqual([...r.data]);expect(out.epsg).toBe(2154);expect(out.originX).toBe(800000);expect(out.resX).toBe(10);});
});
