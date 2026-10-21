import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";

export interface OverlayLayer {
  id: string;
  url: string;
  bounds: [[number, number], [number, number]];
  opacity: number;
  visible: boolean;
}
export interface VectorLayer {
  id: string;
  data: GeoJSON.GeoJsonObject;
  visible: boolean;
  color?: string;
}

export const BASEMAPS = {
  osm: { label: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
  satellite: { label: "Imagerie Esri", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
  clair: { label: "Gris clair (Esri)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
} as const;
export type BasemapKey = keyof typeof BASEMAPS;

export const PSL_CENTER: [number, number] = [43.387, 4.805];

interface Props {
  overlays?: OverlayLayer[];
  vectors?: VectorLayer[];
  basemap?: BasemapKey;
  className?: string;
  onClick?: (lat: number, lng: number) => void;
  fitTo?: [[number, number], [number, number]] | null;
  syncRef?: React.MutableRefObject<Leaflet.Map | null>;
  mapRef?: React.MutableRefObject<Leaflet.Map | null>;
  syncMap?: Leaflet.Map | null;
  onReady?: (map: Leaflet.Map | null) => void;
}

export function MapView({ overlays = [], vectors = [], basemap = "osm", className, onClick, fitTo, syncRef, mapRef, syncMap, onReady }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const base = useRef<Leaflet.TileLayer | null>(null);
  const layerGroup = useRef<Leaflet.LayerGroup | null>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lf = (mod as unknown as { default: typeof Leaflet }).default ?? mod;
      L.current = lf;
      const m = lf.map(el.current, { zoomControl: true }).setView(PSL_CENTER, 12);
      lf.control.scale({ imperial: false }).addTo(m);
      layerGroup.current = lf.layerGroup().addTo(m);
      m.on("click", (e) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      if (mapRef) mapRef.current = m;
      onReady?.(m);
      setTick((t) => t + 1);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      if (mapRef) mapRef.current = null;
      onReady?.(null);
    };
  }, []);

  const [tick, setTick] = useStateTick();

  useEffect(() => {
    const m = map.current, lf = L.current;
    if (!m || !lf) return;
    base.current?.remove();
    const b = BASEMAPS[basemap];
    base.current = lf.tileLayer(b.url, { attribution: b.attr, maxZoom: 19 }).addTo(m);
    base.current.bringToBack();
  }, [basemap, tick]);

  useEffect(() => {
    const g = layerGroup.current, lf = L.current;
    if (!g || !lf) return;
    g.clearLayers();
    overlays.filter((o) => o.visible).forEach((o) => {
      lf.imageOverlay(o.url, o.bounds, { opacity: o.opacity, className: "pixelated" }).addTo(g);
    });
    vectors.filter((v) => v.visible).forEach((v) => {
      lf.geoJSON(v.data, { style: { color: v.color ?? "#1e3a6e", weight: 2, fillOpacity: 0.05 } }).addTo(g);
    });
  }, [overlays, vectors, tick]);

  useEffect(() => {
    if (fitTo && map.current) map.current.fitBounds(fitTo, { padding: [20, 20] });
  }, [fitTo?.[0][0], fitTo?.[0][1], fitTo?.[1][0], fitTo?.[1][1], tick]);

  useEffect(() => {
    const a = map.current, b = syncMap ?? syncRef?.current;
    if (!a || !b) return;
    let lock = false;
    const sync = (src: Leaflet.Map, dst: Leaflet.Map) => () => {
      if (lock) return;
      lock = true;
      dst.setView(src.getCenter(), src.getZoom(), { animate: false });
      lock = false;
    };
    const f1 = sync(a, b), f2 = sync(b, a);
    f2();
    a.on("move", f1);
    b.on("move", f2);
    return () => { a.off("move", f1); b.off("move", f2); };
  }, [tick, syncMap, syncRef?.current]);

  return <div ref={el} className={className ?? "h-full w-full"} />;
}

import { useState } from "react";
function useStateTick() {
  return useState(0);
}
