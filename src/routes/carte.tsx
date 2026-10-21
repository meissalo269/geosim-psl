import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Slider } from "@/components/ui/slider";
import { BASEMAPS, MapView, type BasemapKey, type OverlayLayer } from "@/components/geo/MapView";
import { EmptyData, PageHeader, Panel, RasterSelect, useRasters } from "@/components/geo/ui";
import { renderToDataUrl, wgs84Bounds, SUPPORTED_EPSG } from "@/lib/raster";
import { useClassColor } from "@/lib/geo-hooks";
import { useGeo } from "@/lib/store";
import proj4 from "proj4";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Visualiseur cartographique — GeoSim PSL" },
      { name: "description", content: "Visualiser les cartes d'occupation du sol, gérer les couches et comparer deux dates." },
      { property: "og:title", content: "Visualiseur cartographique — GeoSim PSL" },
      { property: "og:description", content: "Carte interactive des couches d'occupation du sol." },
    ],
  }),
  component: Viewer,
});

function Viewer() {
  const rasters = useRasters();
  const { classes, datasets } = useGeo();
  const colorOf = useClassColor();
  const [basemap, setBasemap] = useState<BasemapKey>("osm");
  const [state, setState] = useState<Record<string, { visible: boolean; opacity: number }>>({});
  const [active, setActive] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [compare, setCompare] = useState(false);
  const [left, setLeft] = useState(""); const [right, setRight] = useState("");
  const leftMap = useRef<Leaflet.Map | null>(null);
  const [readyMap, setReadyMap] = useState<Leaflet.Map | null>(null);

  const images = useMemo(() => {
    if (typeof document === "undefined") return new Map<string, OverlayLayer>();
    const m = new Map<string, OverlayLayer>();
    rasters.forEach((r) => {
      const b = wgs84Bounds(r.raster);
      if (b) m.set(r.id, { id: r.id, url: renderToDataUrl(r.raster, colorOf), bounds: b, opacity: 0.8, visible: true });
    });
    return m;
  }, [rasters, colorOf]);

  const overlays = rasters.map((r) => images.get(r.id)).filter(Boolean).map((o) => ({ ...o!, visible: state[o!.id]?.visible ?? false, opacity: state[o!.id]?.opacity ?? 0.8 }));
  const vectors = datasets.filter((d) => d.geojson).map((d) => ({ id: d.id, data: d.geojson!, visible: state[d.id]?.visible ?? true }));
  const activeDs = rasters.find((r) => r.id === active);

  function identify(lat: number, lng: number) {
    const r = activeDs?.raster;
    if (!r) return setInfo("Sélectionnez une couche active pour identifier un pixel.");
    let x = lng, y = lat;
    if (!r.geographic && r.epsg !== 4326) {
      if (!r.epsg || !SUPPORTED_EPSG.includes(r.epsg)) return setInfo("CRS non pris en charge pour l'identification.");
      [x, y] = proj4("EPSG:4326", `EPSG:${r.epsg}`, [lng, lat]);
    }
    const col = Math.floor((x - r.originX) / r.resX), row = Math.floor((r.originY - y) / r.resY);
    if (col < 0 || row < 0 || col >= r.width || row >= r.height) return setInfo("Hors de l'emprise du raster.");
    const v = r.data[row * r.width + col];
    const c = classes.find((k) => k.code === v);
    setInfo(v === r.nodata ? `Ligne ${row}, col. ${col} : NoData` : `Ligne ${row}, col. ${col} : valeur ${v}${c ? ` — ${c.name}` : " (hors légende)"}`);
  }

  if (!rasters.length && !datasets.length) return (<div><PageHeader title="Visualiseur cartographique" /><div className="p-6"><EmptyData /></div></div>);
  const set = (id: string, p: Partial<{ visible: boolean; opacity: number }>) => setState((s) => ({ ...s, [id]: { visible: s[id]?.visible ?? false, opacity: s[id]?.opacity ?? 0.8, ...p } }));

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      <PageHeader title="Visualiseur cartographique" actions={
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />Comparer deux dates (cartes synchronisées)</label>
      } />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-4 overflow-y-auto border-r border-border bg-card p-4 lg:w-80">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Fond de carte</div>
            <select className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={basemap} onChange={(e) => setBasemap(e.target.value as BasemapKey)}>
              {Object.entries(BASEMAPS).map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}
            </select>
          </div>
          {compare ? (
            <div className="space-y-3">
              <RasterSelect label="Carte gauche" value={left} onChange={setLeft} rasters={rasters} />
              <RasterSelect label="Carte droite" value={right} onChange={setRight} rasters={rasters} />
            </div>
          ) : (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Couches</div>
              <div className="space-y-3">
                {rasters.map((r) => (
                  <div key={r.id} className={`rounded border p-2 ${active === r.id ? "border-sky" : "border-border"}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={state[r.id]?.visible ?? false} onChange={(e) => set(r.id, { visible: e.target.checked })} />
                      <button className="truncate text-left" onClick={() => setActive(r.id)}>{r.year ?? "?"} · {r.name}</button>
                    </div>
                    {!images.has(r.id) && <p className="mt-1 text-xs text-destructive">CRS non pris en charge pour l'affichage.</p>}
                    <Slider className="mt-2" value={[(state[r.id]?.opacity ?? 0.8) * 100]} max={100} onValueChange={([v]) => set(r.id, { opacity: v / 100 })} />
                  </div>
                ))}
                {datasets.filter((d) => d.geojson).map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state[d.id]?.visible ?? true} onChange={(e) => set(d.id, { visible: e.target.checked })} />{d.name}</label>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Légende</div>
            {classes.map((c) => <div key={c.code} className="flex items-center gap-2 text-sm"><span className="h-3 w-5 rounded-sm" style={{ background: c.color }} /><span className="stat-num text-xs text-muted-foreground">{c.code}</span>{c.name}</div>)}
          </div>
          <Panel title="Couche active">
            {activeDs ? <div className="space-y-1 text-xs"><div className="font-medium">{activeDs.name}</div><div>EPSG:{activeDs.raster.epsg ?? "?"} · {activeDs.raster.width}×{activeDs.raster.height}</div><div>Résolution : {activeDs.raster.resX}</div><div className="mt-2 text-primary">{info || "Cliquez sur la carte pour identifier un pixel."}</div></div> : <p className="text-xs text-muted-foreground">Cliquez sur le nom d'une couche.</p>}
          </Panel>
        </aside>
        <div className="relative min-h-[400px] flex-1">
          <ClientOnly fallback={<div className="grid-paper h-full" />}>
            {compare ? (
              <div className="grid h-full grid-cols-2 gap-px bg-border">
                <MapView key="l" mapRef={leftMap} onReady={setReadyMap} basemap={basemap} overlays={left && images.get(left) ? [images.get(left)!] : []} fitTo={images.get(left)?.bounds ?? null} />
                <MapView key="r" syncMap={readyMap} basemap={basemap} overlays={right && images.get(right) ? [images.get(right)!] : []} />
              </div>
            ) : (
              <MapView basemap={basemap} overlays={overlays} vectors={vectors} onClick={identify} fitTo={overlays.find((o) => o.visible)?.bounds ?? null} />
            )}
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
