# Documentation technique — GeoSim PSL

## Architecture présente

Application TypeScript/React 19 à routage par fichiers TanStack Start. Le serveur assure le rendu initial et la gestion d’erreurs ; **les calculs géomatiques restent dans le navigateur**. Il n’existe pas de base de données ni d’API de calcul scientifique opérationnelle dans l’état audité.

```text
src/server.ts → TanStack Start → src/router.tsx → routeTree.gen.ts
                                           → __root.tsx → AppShell → page
Navigateur → lecture GeoTIFF/GeoJSON → store.ts → analysis.ts / spatial-markov.ts
                                                 → results.ts → cartes/exports
Réseau → actifs PSL, fonds OSM/Esri, polices et CSS externe
```

Leaflet est importé après montage dans le navigateur. `ClientOnly` et les vérifications de disponibilité du document séparent affichage/rendu serveur. Le serveur SSR n’est pas un moteur Python. Les paramètres d’API Python visibles sont des spécifications « non configuré », pas des services livrés.

## Versions déclarées

Versions du `package.json` inspecté ; les plages `^` ne sont pas les versions résolues exactes. **`bun.lock` est la référence d’installation reproductible.**

| Groupe | Dépendances déclarées principales |
|---|---|
| Interface/runtime | React/React DOM ^19.2.0 ; Zustand ^5.0.15 |
| Framework | TanStack Start 1.168.60 ; Router 1.170.41 ; router-plugin 1.168.42 ; Query ^5.101.1 |
| SIG | Leaflet ^1.9.4 ; geotiff ^3.0.5 ; proj4 ^2.22.0 ; Turf point-in-polygon ^7.4.0 |
| Restitution | Recharts ^3.10.1 ; html-to-image ^1.11.13 |
| Styles | Tailwind CSS et plugin Vite ^4.2.1 ; tw-animate-css ^1.3.4 |
| Interface générique | Radix UI ; Lucide ^0.575.0 ; Sonner ^2.0.7 ; CVA, clsx, tailwind-merge |
| Construction | Vite 8.1.5 ; configuration @lovable.dev/vite-tanstack-config 2.26.5 ; Nitro 3.0.260603-beta ; override Rolldown 1.2.1 |
| Qualité | TypeScript ^5.8.3 ; Vitest ^4.1.10 ; ESLint ^9.32.0 ; Prettier ^3.7.3 ; jsdom ^20.0.3 ; Testing Library |

La version Vite déclarée dans le dépôt est 8.1.5 ; une description générique de la base en Vite 7 ne doit pas remplacer cet inventaire. Bun n’est pas épinglé. Les versions TanStack ne sont pas identiques : ne pas les réaligner sans tests.

### Dépendances utilisées versus catalogue

Les parcours actuels utilisent notamment button/input/slider/sonner, Radix slot/slider, CVA, clsx et tailwind-merge. D’autres Radix et les bibliothèques cmdk, embla, input-otp, react-day-picker, react-hook-form, react-resizable-panels et vaul sont référencés par un catalogue de composants génériques peu raccordé aux pages scientifiques. `date-fns`, `zod`, `@hookform/resolvers` sont déclarés sans import explicite identifié dans l’audit. Aucun paquet n’a été supprimé : absence d’import explicite ne signifie pas absence d’utilisation indirecte par le framework.

TypeScript/TSX, CSS, JSON/GeoJSON, Markdown, HTML, CSV et GeoTIFF sont les principaux langages/formats. Pas de scripts Python, R, GDAL, GeoPandas ou entraînement scikit-learn intégrés. Le HTML des rapports TerrSet est une pièce source documentaire.

## Rôle des fichiers principaux

| Fichier/dossier | Responsabilité |
|---|---|
| `src/router.tsx` | Routeur et contexte QueryClient |
| `src/routeTree.gen.ts` | Arbre généré ; ne pas modifier à la main |
| `src/routes/__root.tsx` | Document, ressources de tête, fournisseurs, erreurs, shell et Outlet |
| `src/start.ts` | Middleware d’erreur et protection CSRF des fonctions serveur |
| `src/server.ts` | Enveloppe SSR, normalisation des erreurs catastrophiques |
| `src/lib/error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | Capture, page de secours et remontée optionnelle des erreurs |
| `src/lib/raster.ts` | Types raster, lecture, comptage, aire, emprise, compatibilité et image |
| `src/lib/study-mask.ts` | Masque polygonal au centre des pixels, non exécuté automatiquement à l’import |
| `src/lib/psl-inputs.ts` | Téléchargement des trois cartes pré-masquées et de la limite |
| `src/lib/analysis.ts` | Changements, matrices, quantités Markov, confusion, CSV/download |
| `src/lib/spatial-markov.ts` | Tirage spatial reproductible ; variante de voisinage CA |
| `src/lib/raster-export.ts` | GeoTIFF catégoriel signé et PNG avec légende |
| `src/lib/store.ts` | Jeux de données, classes, années, journal temporaire et démo FICTIF |
| `src/lib/results.ts` | Derniers résultats par type dans la session |
| `src/lib/geo-hooks.ts` | Couleurs et overlays dérivés des données |
| `src/lib/utils.ts` | Composition de classes CSS |
| `src/components/geo/MapView.tsx` | Leaflet, fonds, couches, clics et synchronisation |
| `src/components/geo/ChartPanel.tsx` | Export PNG/SVG avec titre et contexte |
| `src/components/geo/AppShell.tsx`, `ui.tsx` | Navigation, thème, sélecteurs et éléments scientifiques |
| `src/components/ui/`, `src/hooks/use-mobile.tsx` | Primitives et support d’affichage adaptatif |
| `src/styles.css` | Tailwind v4, jetons sémantiques et thème |
| `src/assets/` | Pointeurs des données et logos ; pas une archive raster autonome |
| `public/` | Favicon et robots |
| `src/lib/*.test.ts`, `src/test/` | Tests scientifiques ciblés et correspondance de pages |
| `docs/` | Documentation autonome académique |
| `resultats/` | Pièces sources et destinations des exports documentés |

## Pages

| URL | Fichier dans `src/routes/` | Rôle |
|---|---|---|
| `/` | `index.tsx` | Accueil cartographique scientifique |
| `/tableau-de-bord` | `tableau-de-bord.tsx` | Statistiques de session ; peut inclure des prédictions |
| `/donnees` | `donnees.tsx` | Import, métadonnées et chargement PSL |
| `/carte` | `carte.tsx` | Consultation, couches, identification et comparaison |
| `/analyse` | `analyse.tsx` | Matrices, changements, gains/pertes |
| `/simulation` | `simulation.tsx` | Configuration, calcul et restitution Markov/CA |
| `/validation` | `validation.tsx` | Confusion et métriques pour deux cartes de même date |
| `/rapports` | `rapports.tsx` | Derniers résultats, impression et exports |
| `/historique` | `historique.tsx` | Journal temporaire |
| `/parametres` | `parametres.tsx` | Légende, années et fonctions non configurées |
| `/documentation` | `documentation.tsx` | Méthodes présentées dans l’application |

Le futur suivi K-means/ISODATA/CTA n’est pas encore une page disponible. Aucun changement de chemin, de composant ni de logique scientifique n’a été effectué pour la préparation documentaire.

## Configuration et outils

- `package.json` : scripts et dépendances ; `bun.lock` : résolution ; `bunfig.toml` : installation et délai d’ancienneté.
- `vite.config.ts` : configuration encapsulée, serveur personnalisé et pré-optimisation slider/Leaflet/geotiff/proj4/Recharts/Zustand/Sonner pour éviter des problèmes de dépendances/React.
- `tsconfig.json` : TypeScript strict ; `noUncheckedIndexedAccess` désactivé pour l’indexation raster/matrice, ainsi que les contrôles de variables inutilisées. Ne pas le présenter comme une preuve d’absence de défauts.
- `vitest.config.ts`, `src/test/setup.ts` : environnement jsdom et préparation.
- `eslint.config.js`, `.prettierrc`, `.prettierignore` : règles de qualité et formatage.
- `components.json` : configuration des primitives shadcn.
- `AGENTS.md` : contraintes techniques de maintenance ; `roadmap.md` : tâches réalisées/proposées.

## Hébergement et portabilité

La configuration encapsule les plugins React/TanStack/Tailwind et Nitro ; ne pas les ajouter en double. Cloudflare est une cible de compilation annoncée par la configuration, pas la preuve d’un déploiement indépendant vérifié. L’application garde son serveur SSR : GitHub Pages n’exécute pas cette entrée. Les URL d’actifs relatives et les chemins absolus, dont `/favicon.png`, demandent un examen pour un sous-répertoire de dépôt.

Le partage GitHub du code ne nécessite pas de migration du rendu. Les contrôles de déploiement et la migration autonome restent séparés de cette documentation.
