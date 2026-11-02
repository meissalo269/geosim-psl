# Données, provenance et pièces justificatives

## Inventaire des entrées de l’étude

| Pièce | Source | Usage | Statut |
|---|---|---|---|
| `DF_PSL_2018_df_kernel.tif`, `DF_PSL_2021_df_kernel.tif`, `DF_PSL_2024_df_kernel.tif` | Téléversements de Meïssa Lo | Classifications amont TerrSet/Random Forest | Originaux disponibles dans les téléversements, non copiés dans le dépôt |
| `psl.zip` | Téléversement de Meïssa Lo | Limite polygonale de l’étude | Original non copié ; GeoJSON converti référencé par actif |
| `PSL_2018_zone_etude.tif`, `PSL_2021_zone_etude.tif`, `PSL_2024_zone_etude.tif` | Actifs pré-masqués à partir des données fournies | Observations utilisées par le chargeur PSL | Référencés dans `src/assets/psl-*.asset.json` |
| `psl.geojson` | Conversion de la limite fournie | Affichage et source du masque | `src/assets/psl-boundary.asset.json` |
| `RAPPORT_DE_PRECISION_2018.html`, `2021.html`, `2024.html` | Exports TerrSet fournis | Pièces de comparaison aux données CLC d’entraînement | Copies inchangées dans `../resultats/tableaux/terrset/` |
| CORINE Land Cover 2018 | Entraînement déclaré, produit Copernicus/EEA | Classes de référence amont | Échantillons et recodage effectivement utilisés non disponibles |

La limite est traitée comme fournie ; aucune certification de sa correspondance à la limite administrative officielle n’est déclarée. Les rasters portent quatre classes communes : 1 surfaces artificialisées, 2 végétation, 3 eau et zones humides, 4 sols nus.

## Métadonnées vérifiées sur les objets servis

Vérification le 1er novembre 2026 dans l’environnement local, sans recalcul scientifique : les quatre requêtes ont répondu HTTP 200. Les trois TIFF ont une grille 501 × 536, un pas de 30 m, EPSG:32631, une origine supérieure gauche (640380, 4815450) et NoData −9999. Les valeurs valides inspectées appartiennent à 1–4. Chaque fichier masqué a une taille de 1 075 144 octets ; le GeoJSON a 1 380 octets.

Les empreintes SHA-256 sont consignées dans [le manifeste](../resultats/inventaire-donnees.json) : elles identifient les objets servis au contrôle, pas la pertinence scientifique de leur contenu. La transformation originaux → objets masqués n’a pas été réexécutée dans cette mission.

## Limites de portabilité des actifs

Un fichier `.asset.json` **n’est pas un GeoTIFF**. Ses URL sont relatives à un service d’actifs (`/__l5e/assets-v1/...`), pas à GitHub. Le dépôt seul ne transporte donc pas les rasters. Un clone dans un environnement indépendant peut exécuter les tests mais ne garantit pas « Charger mes cartes PSL ».

Pour reproduire les analyses ailleurs, récupérer les GeoTIFF masqués accessibles dans la page Données avant migration, conserver les empreintes, puis les importer par le sélecteur local. Convertir la limite en GeoJSON WGS84 si nécessaire. Les originaux non masqués ne sont pas interchangeables avec les actifs utilisés : déclarer le masque et son mode d’inclusion. Ne pas retirer les pointeurs sans adapter les imports de manière autorisée.

## CORINE : échelle et indépendance

CLC 2018 est une source d’entraînement déclarée. Le produit officiel comprend un raster à 100 m et des données vectorielles, avec unité minimale cartographiée de 25 ha ; cela **ne signifie pas** que l’entraînement effectivement utilisé est exactement ce raster ni que sa résolution serait 30 m. La version du produit, le recodage des 44 classes, la création des échantillons et les critères d’inclusion doivent être fournis par les auteurs.

La réutilisation de CLC à la validation ne suffit pas à une estimation indépendante de la précision ; une référence de 2018 ne prouve pas une vérité terrain de 2021 ou 2024.

## Rapports TerrSet originaux

Les trois rapports sont des matrices de confusion : lignes cartographiées, colonnes `TRAINEMENT_CLC_2018_B1_INT`. Ils indiquent 65 287 pixels et les kappa globaux suivants, **transcrits sans recalcul** :

| Année cartographiée | Kappa indiqué dans le HTML |
|---|---:|
| 2018 | 0,996017 |
| 2021 | 0,995480 |
| 2024 | 0,995015 |

Ce support est distinct de l’ensemble des pixels valides masqués du WebSIG ; ne pas combiner arbitrairement ces effectifs avec les matrices diachroniques. Les fichiers HTML font foi pour leurs chiffres. Aucune nouvelle valeur de précision, matrice ou prédiction n’est créée par cette documentation.

## Informations à compléter pour la remise

- Capteur, produit satellite, identifiant de scène, date/heure, couverture nuageuse et niveau de traitement pour chaque image.
- Bandes, indices réellement utilisés, corrections atmosphériques/radiométriques et masques.
- Version TerrSet de la classification Random Forest, paramètres et temps de calcul.
- Version/format CLC, recodage, échantillons, plan d’entraînement et test indépendant.
- Auteur, date, CRS et source institutionnelle éventuelle de la limite.
- Scripts et journal reproductible du pré-masquage ; images sources si leur licence le permet.
- Versions QGIS/Bun/système et droits de redistribution.

Les noms d’auteurs constituent une attribution publique demandée, pas des identifiants de connexion. Les identifiants d’actifs sont de la métadonnée de diffusion et ne doivent pas être confondus avec des clés privées.
