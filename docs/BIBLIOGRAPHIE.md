# Bibliographie et références vérifiables

Sources méthodologiques et documentations vérifiées le 1er novembre 2026. Elles ne constituent pas une preuve que tous les protocoles de ces travaux sont appliqués par GeoSim PSL.

## Articles scientifiques

1. **Breiman, L. (2001).** Random Forests. *Machine Learning*, **45**, 5–32. https://doi.org/10.1023/A:1010933404324  
   Fondement des forêts aléatoires utilisées dans la classification amont déclarée. Ne justifie pas à lui seul ses performances locales.
2. **Pontius, R. G., Jr., et Millones, M. (2011).** Death to Kappa: birth of quantity disagreement and allocation disagreement for accuracy assessment. *International Journal of Remote Sensing*, **32**(15), 4407–4429. https://doi.org/10.1080/01431161.2011.552923  
   Discussion critique du kappa et distinction quantité/allocation. Les mesures de désaccord proposées ne sont pas implémentées dans l’application.
3. **Olofsson, P., Foody, G. M., Herold, M., Stehman, S. V., Woodcock, C. E., et Wulder, M. A. (2014).** Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment*, **148**, 42–57. https://doi.org/10.1016/j.rse.2014.02.015  
   Échantillonnage de référence, estimation des superficies et évaluation de précision. Les surfaces de GeoSim sont des comptes cartographiques, pas des estimations ajustées suivant un plan d’échantillonnage indépendant.

## Données et logiciels géomatiques

4. **Copernicus Land Monitoring Service / European Environment Agency (s. d.).** *CORINE Land Cover 2018 (vector/raster 100 m), Europe, 6-yearly*. Fiche officielle : https://land.copernicus.eu/en/products/corine-land-cover/clc2018  
   La fiche consultée présente la version V2020_20u1. La version réellement utilisée à l’entraînement PSL reste à confirmer ; le millésime 2018 n’est pas une date bibliographique inventée.
5. **Clark University (2024).** *TerrSet Manual* [TerrSet liberaGIS]. https://cdn.clarku.edu/geospatial-analytics/wp-content/uploads/sites/117/Terrset-liberaGIS-Manual.pdf  
   Ressource officielle de l’environnement TerrSet ; téléchargement institutionnel : https://www.clarku.edu/geospatial-analytics/terrset/download/. La version utilisée pour les classifications historiques n’est pas certifiée par cette citation.
6. **Toledano, J., Clark Labs (2012, 1er août).** Réponse technique dans *suitability maps in CA_MARKOV*. Clark Labs Support Center. https://forums.clarklabs.org/hc/en-us/community/posts/202927637-suitability-maps-in-CA-MARKOV  
   Source technique institutionnelle sur les cartes d’aptitude et MOLA, non article évalué par les pairs. Ne rend pas le CA simplifié du projet équivalent au CA_MARKOV de TerrSet.
7. **QGIS Project (s. d.).** *QGIS User Guide*. https://docs.qgis.org/latest/en/docs/user_manual/index.html  
   Guide officiel pour préparer et contrôler les couches. La version effectivement utilisée doit être relevée pour une reproduction figée.

## Documentation technique des bibliothèques

| Outil | Documentation officielle | Usage dans le projet |
|---|---|---|
| React | https://react.dev/ | Interface |
| TanStack Start / Router | https://tanstack.com/start/latest ; https://tanstack.com/router/latest | Rendu et navigation |
| Leaflet | https://leafletjs.com/reference.html | Affichage cartographique |
| geotiff.js | https://geotiffjs.github.io/ | Lecture/écriture GeoTIFF |
| Proj4js | https://proj4js.org/ | Transformation de coordonnées |
| Turf | https://turfjs.org/docs/api/booleanPointInPolygon | Inclusion polygonale |
| Recharts | https://recharts.github.io/ | Graphiques |
| Vitest | https://vitest.dev/ | Tests logiciels |

Les documentations `latest` évoluent : consulter le verrou de dépendances pour identifier l’environnement livré. Les fonds OpenStreetMap/Esri et leurs conditions de diffusion ne sont pas des sources de validation des classifications. Aucune référence satellite ou acquisition absente n’est ajoutée artificiellement.
