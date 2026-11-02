# Cartes, figures, tableaux et résultats

Ce dossier est préparé pour des **productions réellement obtenues**, sans exemples scientifiques inventés. L’application ne l’alimente pas automatiquement : les exports du navigateur doivent y être placés après vérification et avec leur provenance.

| Dossier | Contenu prévu | État initial |
|---|---|---|
| `cartes/` | Classifications et cartes de changement/transition réellement exportées ou mises en page | Notice seulement |
| `figures/` | Graphiques PNG/SVG et captures documentées | Notice seulement |
| `tableaux/` | Matrices de transition, confusion et tables CSV | Rapports TerrSet originaux dans `terrset/` |
| `simulations/` | GeoTIFF/PNG prédictifs et paramètres correspondants | Notice seulement |

`inventaire-donnees.json` identifie les actifs d’entrée servis lors du contrôle. Il ne contient pas de résultat de simulation. `journal-experiences.csv` contient **uniquement son en-tête** : ne pas le prendre pour un registre déjà rempli.

## Convention de traçabilité

Donner à chaque expérience un identifiant stable. Nom suggéré : `PSL_<type>_<periode-ou-cible>_<modele>_<graine>_<id>.<extension>` ; omettre les éléments sans objet. Le nom du fichier ne remplace pas le journal.

Consigner : date, opérateur, source et empreinte des entrées, classes, support/NoData, période, modèle, graine, pas, paramètres supplémentaires, statut réel/FICTIF, fichiers de sortie, référence de validation et indépendance. Le CSV utilise `;` ; entourer de guillemets une cellule qui contient ce séparateur. Un fichier absent ou une valeur inconnue doit rester explicitement absent/inconnu, jamais rempli par un résultat supposé.

Les rapports HTML TerrSet sont **des pièces fournies**, non des analyses nouvellement calculées. Ne pas les appeler matrices de transition et ne pas présenter leur accord aux données d’entraînement CLC comme précision indépendante. Les cartes FICTIVES restent séparées et nommées comme telles.

## Vérification avant remise

Ouvrir chaque carte/figure, contrôler sa légende, sa période et ses unités, relire chaque matrice, vérifier le sens lignes/colonnes et comparer les empreintes des données. Pour les cartes géoréférencées, contrôler CRS, résolution, emprise et NoData dans QGIS. Exporter avant actualisation de l’application ; joindre le journal et ne pas mélanger les dernières sorties de plusieurs expériences.
