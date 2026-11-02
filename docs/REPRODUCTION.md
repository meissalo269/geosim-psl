# Reproduction et évaluation du projet

## 1. Trois niveaux à distinguer

1. **Reproduire le logiciel** : installer les dépendances verrouillées, lancer l’application et les tests.
2. **Reproduire une analyse** : employer exactement les mêmes rasters masqués, classes, période, modèle et graine, puis conserver les sorties.
3. **Reproduire les classifications amont** : disposer des images sources, entraînements, paramètres et versions TerrSet. Ce troisième niveau n’est pas possible avec le dépôt seul à ce jour.

## 2. Installation

Bun doit être installé ; sa version n’est pas épinglée. Relever `bun --version`, le système et la date dans le journal de remise. Depuis le dossier contenant `package.json` :

```bash
bun install --frozen-lockfile
bun run dev
```

Utiliser l’adresse affichée par Vite, ne pas supposer que le port local est celui du site publié. Les dépendances sont résolues par `bun.lock` ; ne pas les mettre à jour pour reproduire une expérience. La configuration Bun applique un délai d’ancienneté de publication des paquets ; ne pas supprimer ce contrôle pour résoudre un échec d’installation sans examen.

```bash
bun run test
bun run lint
bun run build
bun run preview
```

`test` exécute Vitest, `lint` vérifie les conventions, `build` prépare la distribution et `preview` la prévisualise. Aucun script ne crée un dépôt ou ne publie le site. `format` modifie les fichiers : ne pas l’utiliser comme commande de vérification en lecture seule.

### Contrôle réellement effectué lors de la préparation

Le 1er novembre 2026, 15 tests ont réussi dans quatre fichiers : analyse (3), Markov spatial/GeoTIFF (7, dont deux méthodes), masque (2), routage (3). Les tests utilisent des cas contrôlés, pas les résultats d’une étude réelle. Les quatre actifs PSL ont répondu HTTP 200 dans l’environnement local et leurs métadonnées ont été inspectées. Installation sur une machine indépendante, lint, distribution de production, hébergement et validation scientifique ne sont pas attestés par ces seuls contrôles.

## 3. Disposer des entrées exactes

Les `.asset.json` ne transportent pas les binaires. Avant une copie indépendante, télécharger les trois GeoTIFF **pré-masqués** depuis la page `/donnees` et contrôler leurs SHA-256 avec `resultats/inventaire-donnees.json`. Sur votre ordinateur, par exemple :

```bash
sha256sum PSL_2018_zone_etude.tif PSL_2021_zone_etude.tif PSL_2024_zone_etude.tif
```

Sous PowerShell, utiliser `Get-FileHash -Algorithm SHA256`. Un clone GitHub sans service d’actifs peut utiliser l’import local de ces fichiers ; son bouton PSL et la limite de l’accueil peuvent rester indisponibles. La limite importée doit être GeoJSON WGS84. Importer la limite seule ne masque pas les données.

## 4. Parcours reproductible d’analyse

1. Ouvrir `/donnees`, charger les cartes PSL ou importer les copies masquées.
2. Vérifier années 2018/2021/2024, quatre codes communs, EPSG:32631, dimensions, résolution, origine et NoData.
3. Dans `/analyse`, choisir explicitement les cartes initiale/finale et les quatre classes. Conserver la même sélection pour les comparaisons entre périodes.
4. Calculer la matrice ; exporter le CSV et les graphiques PNG/SVG. Noter le support valide, les fichiers et toute modification de légende.
5. Répéter, si l’étude le demande, pour 2018–2021, 2021–2024 et 2018–2024. Aucun de ces résultats n’est présumé dans la documentation.

## 5. Parcours reproductible de simulation

1. Ouvrir `/simulation`. Les choix par défaut peuvent être 2018–2021 ; ne pas les confondre avec une calibration 2021–2024.
2. Renseigner t₁, t₂, cible ≤ 2030, modèle et graine. La cible doit être postérieure à t₂.
3. Exemple de **configuration à tester**, et non résultat annoncé : t₁ = 2021, t₂ = 2024, cible = 2030, Markov, graine = 42, soit deux pas. La variante CA utilise les mêmes entrées mais produit un modèle spatial différent.
4. Conserver la matrice P affichée et les paramètres. Le bouton CSV du panneau de probabilités exporte les surfaces, pas P ; voir l’anomalie documentée dans METHODOLOGIE.
5. Exporter la carte GeoTIFF, son PNG et le graphique. Le GeoTIFF ne transporte pas tous les paramètres de simulation ; joindre le journal.
6. Pour tester la répétabilité, refaire la même configuration et comparer les cellules du raster, pas uniquement le nom/timestamp du fichier.
7. Pour l’évaluation rétrospective, calibrer avant la date observée. Le contrôle automatique de superficies ne remplace pas `/validation` avec deux cartes de même année et une référence indépendante.

La validation de 2030 nécessite une observation de référence de 2030 ; on ne peut pas l’obtenir à partir des seuls rasters historiques. Ne pas présenter une simulation comme une observation.

## 6. Archiver une expérience

Utiliser `resultats/journal-experiences.csv` selon `resultats/README.md` : identifiant, entrées et empreintes, classes, période, paramètres, date, fichiers exportés, statut réel/fictif et référence indépendante. Le fichier initial ne contient qu’un en-tête, aucune ligne fictive.

Actualiser ou fermer la page perd les données en mémoire. La suppression d’une donnée ou la modification d’une légende n’invalide pas automatiquement les derniers résultats. Ne pas assembler un rapport avec des résultats de sessions/périmètres incohérents.

## 7. GitHub pour l’enseignant, sans promettre GitHub Pages

Le code peut être examiné dans GitHub sans déployer le site. La connexion Git depuis Lovable se réalise dans les réglages du projet, rubrique Git, et crée un nouveau dépôt ; elle ne peut pas être effectuée en modifiant ce README. Commencer par un dépôt privé et inviter l’enseignant lorsque les droits des données ne sont pas arrêtés.

GitHub Pages ne fournit pas le serveur TanStack Start/Nitro de cette application. Une publication Pages nécessite une stratégie statique vérifiée, des chemins sous le nom du dépôt, les liens directs des pages et des actifs accessibles. Aucun workflow Pages ni migration de rendu n’est ajouté dans cette mission. Une publication SSR indépendante demande aussi un contrôle de la cible et de la configuration effective.

Avant partage : appliquer la liste de contrôle de CONFIDENTIALITE, définir les droits du code/données, indiquer la version remise et joindre seulement les expériences réellement réalisées.
