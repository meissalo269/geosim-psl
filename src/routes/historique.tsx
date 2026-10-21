import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/geo/ui";
import { useGeo } from "@/lib/store";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Historique des traitements — GeoSim PSL" },
      { name: "description", content: "Journal des imports, analyses, simulations et validations." },
      { property: "og:title", content: "Historique des traitements — GeoSim PSL" },
      { property: "og:description", content: "Journal des traitements GeoSim PSL." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const history = useGeo((s) => s.history);
  return (
    <div>
      <PageHeader title="Historique des traitements" subtitle="Journal de la session en cours. La conservation entre sessions sera disponible après activation du stockage en ligne." />
      <div className="p-6">
        <Panel>
          {history.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Date</th><th>Type</th><th>Description</th><th>État</th></tr></thead>
              <tbody>{history.map((h) => (
                <tr key={h.id} className="border-t border-border"><td className="stat-num py-2 text-xs">{new Date(h.date).toLocaleString("fr-FR")}</td><td>{h.type}</td><td>{h.label}</td>
                  <td><span className={h.status === "erreur" ? "text-destructive" : "text-accent"}>● {h.status}</span></td></tr>))}</tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Aucun traitement enregistré.</p>}
        </Panel>
      </div>
    </div>
  );
}
