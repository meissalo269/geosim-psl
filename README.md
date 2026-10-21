# GeoSim PSL

WebSIG scientifique de Port-Saint-Louis-du-Rhône, par Cheikh Ahmed Fadel Keita et Meïssa Lo — Master 1 Géomatique et Modélisation spatiale, Aix-Marseille Université.

## Installation et utilisation

Avec Bun installé, exécuter `bun install`, puis `bun run dev`. `bun run test` exécute les tests ; `bun run build` prépare la production.

L’accueil propose le chargement des classifications PSL 2018, 2021 et 2024 et de la limite fournie. Le tableau de bord est accessible à `/tableau-de-bord`, les méthodes à `/documentation`. Les modules permettent les imports GeoTIFF/GeoJSON, l’analyse des changements, les simulations Markov et CA-Markov simplifié, la validation et les exports.

Les données et résultats sont conservés en mémoire pendant la session, sans compte ni base de données. Les cartes de démonstration sont explicitement FICTIVES. Les résultats simulés ne sont pas utilisés comme observations historiques.

## Méthodes et limites

Les classifications fournies proviennent de Random Forest sous TerrSet avec CORINE Land Cover 2018 comme entraînement, pas comme validation indépendante. La grille est conservée et les centres de pixels extérieurs à la limite fournie sont NoData.

Le CA-Markov simplifié est une réalisation stochastique reproductible avec voisinage 3 × 3 ; il n’utilise pas de cartes d’aptitude ni d’allocation exacte. Les indices continus/saisonniers, l’entraînement de modèles et le moteur Python externe restent non configurés.

## Architecture et hébergement

React 19, TypeScript, TanStack Start, Vite, Tailwind v4, Leaflet, Recharts, geotiff.js, proj4 et Turf. Les bibliothèques cartographiques sont chargées dans le navigateur ; les calculs sont locaux. Les images et données fournies utilisent des pointeurs d’actifs ; le logo généré est importé directement.

Le projet ne dispose pas encore d’une configuration GitHub Pages vérifiée ni d’un dépôt ou déploiement créé. GitHub Pages ne fournit pas le serveur de rendu TanStack Start : préparer un export statique, le chemin de base du dépôt, les pages HTML pour les liens directs et la distribution des données référencées est nécessaire avant de créer le workflow de publication. Ne pas déployer le seul dossier source ni supposer qu’un export des sources remplace ces vérifications.
