import { useMemo } from "react";
import { renderToDataUrl, wgs84Bounds, type RasterData } from "./raster";
import { useGeo } from "./store";

export function useClassColor() {
  const classes = useGeo((s) => s.classes);
  return useMemo(() => {
    const m = new Map(classes.map((c) => [c.code, c.color]));
    return (v: number) => m.get(v) ?? "#888888";
  }, [classes]);
}

export function useRasterImage(r: RasterData | undefined) {
  const colorOf = useClassColor();
  return useMemo(() => {
    if (!r || typeof document === "undefined") return null;
    const bounds = wgs84Bounds(r);
    if (!bounds) return null;
    return { url: renderToDataUrl(r, colorOf), bounds };
  }, [r, colorOf]);
}
