import { useRef, useState, type ReactNode } from "react";
import { toPng, toSvg } from "html-to-image";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "./ui";
import { useGeo } from "@/lib/store";

export function ChartPanel({ title, filename, demo, children, className, context }: {
  title: string; filename: string; demo?: boolean; children: ReactNode; className?: string; context?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const log = useGeo((s) => s.log);
  async function save(format: "png" | "svg") {
    if (!ref.current) return;
    setBusy(true);
    try {
      const options = { pixelRatio: 2, cacheBust: true, skipFonts: true };
      const url = format === "png" ? await toPng(ref.current, options) : await toSvg(ref.current, options);
      const a = document.createElement("a");
      a.href = url; a.download = `${demo ? "FICTIF_" : ""}${filename}.${format}`; a.click();
      log({ type: "Export", label: `${title} (${format.toUpperCase()})`, status: "terminé" });
    } catch { toast.error("Le graphique n’a pas pu être exporté. Réessayez après son affichage complet."); }
    finally { setBusy(false); }
  }
  return <Panel title={title} className={className ?? ""} right={<div className="flex shrink-0 gap-1">
    {(["png", "svg"] as const).map((format) => <Button key={format} size="sm" variant="outline" disabled={busy} onClick={() => save(format)} aria-label={`Exporter ${title} en ${format.toUpperCase()}`}><Download className="mr-1 h-3 w-3" />{format.toUpperCase()}</Button>)}
  </div>}><div ref={ref} className="bg-card p-2 text-foreground">
    <h3 className="mb-1 text-sm font-semibold">GeoSim PSL · {title}</h3>
    {context && <p className="mb-1 text-xs text-muted-foreground">{context}</p>}
    {demo && <p className="mb-2 text-xs text-warning-foreground">FICTIF — données synthétiques, aucune valeur scientifique</p>}
    {children}
  </div></Panel>;
}