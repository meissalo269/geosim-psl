# Méthodologie scientifique et chaîne de traitement

Ce document décrit **le code présent**, et non un protocole expérimental entièrement réalisé. Auteurs : Cheikh Ahmed Fadel Keita et Meïssa Lo. Étude PSL 2018/2021/2024, horizon maximal 2030. Les fonctionnalités du nouveau module TerrSet K-means/ISODATA/CTA sont encore proposées, pas livrées.

## 1. Classification amont : ce qui est connu et ce qui manque

Meïssa Lo a fourni trois classifications issues de Random Forest sous TerrSet, avec CORINE Land Cover 2018 comme entraînement. L’application ne réalise pas cet entraînement. Les images satellitaires sources, dates exactes, bandes, corrections, hyperparamètres, recodage de CLC et séparation entraînement/test ne sont pas disponibles dans le code. Leur absence interdit d’affirmer que la classification initiale est intégralement reproductible.

QGIS peut servir au contrôle des projections, à l’alignement au plus proche voisin, à la conversion en GeoJSON et à la mise en page. Aucun journal QGIS ni version historique ne prouve quelles opérations ont effectivement été faites. La version TerrSet liberaGIS 20.0.5 déclarée pour le futur suivi d’expériences ne certifie pas la version ayant produit les anciennes cartes Random Forest.

## 2. Import et domaine spatial

`src/lib/raster.ts`, `src/routes/donnees.tsx` : lecture de la première image et de la première bande du GeoTIFF ; valeurs entières signées sur 32 bits, NoData entier, origine et résolution finies, nord en haut, sans rotation. Au-delà de 25 000 000 pixels, l’import est refusé. Cette limite n’est pas une garantie de rapidité ou de mémoire suffisante.

Les comparaisons exigent mêmes EPSG, dimensions, résolutions et origines. La tolérance est le minimum des résolutions X multiplié par 10⁻⁶. Des NoData différents sont signalés mais chacun est exclu. Aucun rééchantillonnage ni reprojection automatique n’est exécuté. En préparation SIG, les données catégorielles doivent être alignées au **plus proche voisin**, et non interpolées bilinéairement.

GeoJSON est attendu en WGS84 selon RFC 7946 ; les contrôles structurels ne remplacent pas une validation topologique complète. ZIP Shapefile et CSV sont reconnus mais leur conversion n’est pas opérationnelle. L’année suggérée est extraite du premier motif à quatre chiffres 19xx/20xx du nom, puis doit être contrôlée.

### Masque PSL

`src/lib/study-mask.ts` copie le raster, transforme chaque centre de pixel en WGS84, teste son inclusion dans un Polygon/MultiPolygon avec Turf, puis remplace l’extérieur par NoData. Les trous sont respectés. La grille originale n’est ni découpée ni rééchantillonnée. En l’absence de NoData, −9999 est choisi, ou décrémenté pour éviter une collision avec un code existant.

Les actifs PSL sont **déjà masqués** : `psl-inputs.ts` les lit sans recalculer le masque. L’import d’un nouveau raster ou la sélection d’une limite comme « Zone d’étude » n’applique **pas** cette fonction. Une limite affichée ne suffit donc pas à garantir le domaine de calcul d’un nouvel import.

## 3. Superficies et matrice de transition

`src/lib/analysis.ts`, `src/lib/raster.ts`, `src/routes/analyse.tsx`.

Pour un pixel projeté, l’aire utilisée est `resX × resY / 10000` hectares, en supposant des unités métriques. Pour un raster géographique :

\[
a_r=R^2\Delta\lambda\lvert\sin\varphi_1-\sin\varphi_2\rvert/10000,
\qquad R=6\,371\,008{,}8\ \mathrm{m}.
\]

En UTM avec pixels 30 × 30 m, un pixel vaut 0,09 ha. Les surfaces projetées ne sont pas corrigées de la distorsion cartographique ; l’hypothèse métrique doit être vérifiée pour d’autres CRS, notamment Web Mercator.

La matrice M est en hectares : lignes = classe initiale, colonnes = classe finale. Pour chaque paire de cellules, NoData dans l’une des cartes ou code hors sélection dans l’une des cartes exclut la paire. Sélectionner seulement certaines classes **exclut leurs échanges avec les classes non sélectionnées** : les totaux ne décrivent plus tout le territoire.

\[
A_i^{début}=\sum_jM_{ij},\quad A_i^{fin}=\sum_jM_{ji},\quad
S=\sum_iM_{ii},\quad T=\sum_{i,j}M_{ij},\quad C=T-S.
\]

\[
G_i=A_i^{fin}-M_{ii},\quad L_i=A_i^{début}-M_{ii},\quad N_i=G_i-L_i.
\]

Le graphique représente les pertes négativement, mais le tableau conserve leur magnitude positive. Le module affiche une carte stabilité/changement et une carte de transitions où les pixels stables sont masqués. Il ne livre pas une série autonome de cartes de gains/pertes par classe exportées. La route accepte aussi des cartes simulées ; l’expérimentateur doit distinguer comparaison exploratoire et série historique.

## 4. Markov : estimation des quantités

`transitionProbabilities`, `projectMarkov`, `stepMarkov` dans `src/lib/analysis.ts`.

\[
P_{ij}=M_{ij}/\sum_jM_{ij}.
\]

Une ligne sans transition observée devient une ligne de la matrice identité. Ce choix maintient la classe faute d’information, sans estimer sa dynamique. P est normalisée à partir des **surfaces**, ce qui coïncide avec la normalisation des effectifs seulement lorsque l’aire des cellules est constante.

Pour les dates t₁ < t₂ < t et le vecteur ligne v₀ des surfaces de la carte t₂ :

\[
s=(t-t_2)/(t_2-t_1),\qquad v_k=v_0P^k.
\]

Si s = k + f, 0 ≤ f < 1 :

\[
v(s)=(1-f)v_0P^k+fv_0P^{k+1}.
\]

C’est une interpolation linéaire, ni une puissance matricielle fractionnaire ni une chaîne de Markov continue. La calibration porte sur le support commun des deux cartes, tandis que v₀ est calculé sur tous les pixels valides de t₂ : vérifier les supports NoData avant interprétation.

La route limite la cible à 2030, impose une date entière postérieure à t₂ et au plus 100 pas. **2030 est une borne choisie pour le projet**, pas un seuil universel démontré de validité. Les moteurs ne reçoivent pas d’année ; ils contrôlent seulement les pas. Par défaut, les sélecteurs prennent les deux premières cartes historiques : contrôler explicitement la période.

## 5. Markov spatial et CA-Markov simplifié

`src/lib/spatial-markov.ts` applique des transitions aux cellules de la carte t₂. Les NoData sont conservés. Les rasters générés portent `isPrediction` et sont exclus de la calibration par `src/routes/simulation.tsx`.

Générateur pseudo-aléatoire reproductible :

\[
x_{n+1}=16807x_n\bmod2147483647,\quad u_n=x_n/2147483647.
\]

Graine entière de 1 à 2 147 483 646 ; valeur initiale de l’interface : 42. À chaque pas, un tirage cumulatif choisit la destination. Pour un dernier pas fractionnaire : Q = (1−f)I + fP. Sans CA et sur un support identique, les quantités obtenues **en espérance** suivent l’interpolation précédente ; une réalisation finie fluctue.

Pour CA-Markov : voisinage de Moore 3 × 3 **sans la cellule centrale**, soit huit voisins maximum. Les bords ne rebouclent pas ; voisins NoData/hors légende exclus. Les poids sont :

\[
w_j=Q_{ij}(1+n_j/N),\qquad \Pr(j)=w_j/\sum_\ell w_\ell.
\]

Avec N = 0, le multiplicateur vaut 1. Le facteur évite d’annuler une transition positive lorsque la classe est absente localement ; **une probabilité historique nulle reste nulle**. Il ne s’agit pas d’un lissage additif classique de Laplace, malgré le commentaire du code. La mise à jour est synchrone : les voisins proviennent de l’état précédent.

Pas de cartes d’aptitude, de pente, de contraintes physiques/réglementaires, de demande surfacique exacte ni d’optimisation d’allocation. Ce moteur n’est **pas équivalent au CA_MARKOV complet de TerrSet**. Le voisinage modifie les probabilités et les quantités ; les surfaces théoriques Markov ne sont pas des quotas imposés au CA. Une graine produit une réalisation, pas un intervalle d’incertitude.

## 6. Contrôle rétrospectif et validation

### Contrôle des quantités

La simulation cherche la première observation historique compatible postérieure à t₂ et ≤ cible, puis compare ses superficies aux quantités théoriques Markov. Aucun raster rétrospectif n’est produit par ce contrôle, aucune précision spatiale n’y est calculée. Les supports valides et l’indépendance ne sont pas vérifiés automatiquement. Avec les seules dates fournies, 2024 peut contrôler 2018–2021 ; aucune observation ne suit 2024.

### Matrice de confusion

`computeValidation` dans `analysis.ts`, route `/validation`. Deux rasters distincts, de même année et compatibles sont nécessaires ; la référence ne doit pas être une prédiction générée. Ces contrôles **ne prouvent pas** qu’elle est indépendante de l’entraînement ou de la calibration.

C est une matrice d’effectifs : lignes observées, colonnes prédites. Seuls les pixels valides des classes connues sont comparés ; un code hors légende n’est pas compté comme une erreur. Pour n pixels :

\[
OA=\sum_iC_{ii}/n,\qquad p_e=\sum_iC_{i+}C_{+i}/n^2,\qquad
\kappa=(OA-p_e)/(1-p_e).
\]

\[
PA_i=C_{ii}/C_{i+},\qquad UA_i=C_{ii}/C_{+i},\qquad
F1_i=2PA_iUA_i/(PA_i+UA_i).
\]

Kappa devient NaN si pₑ = 1 ; les précisions par classe à dénominateur nul valent 0 dans cette implémentation, à distinguer d’une précision réellement observée nulle.

Les rapports TerrSet fournis inversent la convention : **lignes cartographiées, colonnes de référence**. Ils comparent au raster nommé `TRAINEMENT_CLC_2018_B1_INT`, également déclaré comme entraînement. Ce sont des accords à cette référence, non une validation indépendante, et non des matrices de transition temporelle.

Les désaccords de quantité/allocation de Pontius, les surfaces ajustées par échantillonnage et les intervalles d’incertitude ne sont pas implémentés. Une validation future doit disposer d’une référence contemporaine indépendante et inclure une comparaison à la persistance, sans présenter ces perspectives comme des résultats acquis.

## 7. Affichage, exports et stockage

Les images de classification sont placées dans des bornes WGS84 par `Leaflet.imageOverlay`. Ce n’est pas une reprojection raster pixel par pixel ; un écart visuel au fond peut exister sans modifier la grille analytique.

- Graphiques : PNG/SVG avec titre et contexte capturés par `ChartPanel`.
- Matrices et tableaux : CSV UTF-8, séparateur `;`, matrice de transition arrondie à deux décimales.
- Prédiction : GeoTIFF catégoriel signé 32 bits, CRS/origine/résolution/NoData conservés. La graine, P et la légende ne sont pas intégrées comme archive d’expérience complète.
- PNG prédictif : image raster et légende, pas le fond Leaflet ni son échelle.
- Rapport : impression du navigateur, pouvant être enregistrée en PDF ; pas de générateur documentaire serveur.

`store.ts` conserve données et journal en mémoire ; `results.ts` conserve seulement la dernière analyse, simulation et validation. Modifier une légende ou supprimer une entrée ne réexécute pas ses résultats. Exporter ensemble les pièces d’une même expérience avant actualisation et documenter toute modification.

### Anomalies de restitution identifiées, non corrigées dans cette mission

Dans `simulation.tsx`, le CSV du panneau de probabilités exporte des superficies plutôt que P, et une cellule contient une expression conditionnelle littérale au lieu de sa valeur. Le CSV de la page Rapports contient seulement les quantités initiales/théoriques. L’événement d’export PDF est journalisé avant confirmation de l’impression. Ces limites sont signalées pour l’évaluation ; **aucune logique existante n’a été modifiée**.

## 8. Développement et vérification : étapes fonctionnelles

1. Base React/TanStack, pages et composants cartographiques.
2. Import catégoriel, calculs de surface, compatibilité et démonstration FICTIF.
3. Changements, matrices et visualisation.
4. Markov quantitatif et spatial ; CA simplifié, graine, exports et tests.
5. Intégration des rasters fournis et du masque PSL préparé en amont.
6. Accueil scientifique distinct du tableau de bord, provenance, thème et documentation.
7. Préparation documentaire académique et inventaire de reproductibilité.
8. Proposition de suivi durable des expériences manuelles TerrSet : **en attente d’accord**, sans exécution intégrée des algorithmes.

Cette liste décrit des étapes attestées par les fonctions et les échanges, pas une chronologie horodatée de commits. Les tests logiciels démontrent des comportements sur exemples contrôlés, **pas** la validité des classifications ni la pertinence prospective.
