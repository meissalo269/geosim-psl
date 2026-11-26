import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice, PageHeader, Panel } from "@/components/geo/ui";
import { useGeo } from "@/lib/store";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Paramètres du projet — GeoSim PSL" },
      { name: "description", content: "Classes d'occupation du sol, codes, couleurs, années et moteur de traitement." },
      { property: "og:title", content: "Paramètres du projet — GeoSim PSL" },
      { property: "og:description", content: "Configurer la légende et les années de l'étude." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { classes, setClasses, years, addYear } = useGeo();
  const [y, setY] = useState("");
  const codes = classes.map((c) => c.code);
  const dup = codes.length !== new Set(codes).size;
  const upd = (i: number, p: Partial<(typeof classes)[number]>) => setClasses(classes.map((c, k) => (k === i ? { ...c, ...p } : c)));

  return (
    <div>
      <PageHeader title="Paramètres du projet" />
      <div className="grid gap-6 p-6 xl:grid-cols-2">
        <Panel title="Classes d'occupation du sol" right={<Button size="sm" variant="outline" onClick={() => setClasses([...classes, { code: Math.max(0, ...codes) + 1, name: "Nouvelle classe", color: "#888888" }])}><Plus className="mr-1 h-3 w-3" />Classe</Button>}>
          <div className="space-y-2">
            {classes.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="number" className="w-20" value={c.code} onChange={(e) => upd(i, { code: Number(e.target.value) })} />
                <Input value={c.name} onChange={(e) => upd(i, { name: e.target.value })} />
                <input type="color" className="h-9 w-12 cursor-pointer rounded border border-input" value={c.color} onChange={(e) => upd(i, { color: e.target.value })} />
                <Button variant="ghost" size="icon" onClick={() => setClasses(classes.filter((_, k) => k !== i))} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          {dup && <div className="mt-3"><Notice tone="error" title="Codes en double">Chaque classe doit avoir un code unique.</Notice></div>}
          <p className="mt-3 text-xs text-muted-foreground">Vérifiez que les codes correspondent à la légende de chaque raster importé : aucune correspondance n'est supposée automatiquement.</p>
        </Panel>
        <Panel title="Années de l'étude">
          <div className="mb-3 flex flex-wrap gap-2">{years.map((x) => <span key={x} className="stat-num rounded bg-secondary px-2 py-1 text-sm">{x}</span>)}</div>
          <div className="flex gap-2"><Input type="number" placeholder="ex. 2015" value={y} onChange={(e) => setY(e.target.value)} className="w-32" /><Button variant="outline" onClick={() => { if (y) { addYear(Number(y)); setY(""); } }}>Ajouter</Button></div>
        </Panel>
        <Panel title="Traitements disponibles" className="xl:col-span-2">
          <ul className="list-disc space-y-1 pl-5 text-sm"><li>Matrices de transition et probabilités de Markov</li><li>Markov spatial stochastique</li><li>CA-Markov simplifié (voisinage 3×3)</li><li>Exports GeoTIFF, CSV et graphiques</li></ul>
        </Panel>
      </div>
    </div>
  );
}
