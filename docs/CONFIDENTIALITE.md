# Confidentialité et préparation du partage GitHub

## Contrôle réalisé et limites

Le 1er novembre 2026, une recherche de signatures de clés privées, jetons fournisseurs et affectations explicites de secrets sur **99 fichiers texte partageables** n’a pas déclenché d’alerte. Aucun fichier d’environnement `.env` ou `.dev.vars` n’était présent à la racine inspectée. Les valeurs sensibles ne sont pas consignées dans la documentation.

Ce contrôle couvre l’état courant des fichiers texte examinés, **pas** l’historique Git, les secrets des services, les dépendances transitives, les métadonnées de tous les binaires ni toutes les formes possibles de secrets. Ce n’est pas une certification de sécurité ni un audit de vulnérabilités.

## Éléments diffusés ou reliés à des tiers

- Les quatre pointeurs de données comprennent URL, identifiants d’actifs/projet et références de stockage. Ce sont des métadonnées consommées par le navigateur, pas des mots de passe ; les données qu’elles rendent accessibles ne doivent pas être considérées comme privées.
- Les imports locaux sont lus dans le navigateur et stockés en mémoire ; aucun téléversement de ces imports n’est identifié dans ce parcours existant.
- OpenStreetMap, Esri, Google Fonts et le CDN du CSS Leaflet reçoivent des requêtes réseau.
- `lovable-error-reporting.ts` transmet optionnellement aux hooks disponibles des erreurs, contexte, chemin et pile ; aucun masquage général de contenu sensible n’est implémenté. Les journaux serveur peuvent contenir des causes et piles.
- Les captures, rapports HTML et exports peuvent contenir noms de fichiers ou coordonnées. Les examiner avant diffusion.

## Exclusions du dépôt

Le `.gitignore` existant exclut dépendances, logs, principales sorties compilées, Wrangler et `.dev.vars`, mais **n’exclut pas généralement `.env` et ses variantes**. Ce fichier est géré en lecture seule dans cet environnement : aucune protection supplémentaire effective n’a été ajoutée par cette mission.

Avant d’ajouter un secret ou de publier depuis un export local, compléter les exclusions dans l’environnement Git que vous contrôlez, notamment :

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
.cache/
.workspace/
.lovable/
```

Un `.env.example` ne doit contenir que des noms et valeurs factices explicitement non confidentielles. Ne pas y placer un jeton « de test » fonctionnel. Les métadonnées locales et de session ne sont pas nécessaires à une remise académique. Ne pas supprimer les fichiers scientifiques ou les pointeurs utilisés par le code sans préparer une alternative autorisée.

## Liste de contrôle avant remise

- [ ] Examiner les fichiers réellement envoyés, y compris cachés et pièces jointes.
- [ ] Exclure `.git/` des archives de sources, `node_modules/`, sorties compilées, journaux, sessions et secrets.
- [ ] Faire contrôler l’historique Git par un scanner de secrets ; ne pas publier son rapport brut.
- [ ] Si un secret a été exposé, le révoquer/remplacer : le supprimer d’un fichier ne suffit pas.
- [ ] Vérifier l’accès aux données référencées et leurs droits ; aucun droit n’est inféré du simple téléversement.
- [ ] Préciser une licence du code et les autorisations des images/classifications/limite ; ne pas inventer de licence.
- [ ] Pour une évaluation, privilégier un dépôt privé partagé avec l’enseignant si les autorisations restent indéterminées.
- [ ] Consigner les références et la version de remise, en séparant originaux et résultats dérivés.

La connexion GitHub, les permissions du dépôt et ses règles de protection n’ont pas été vérifiées ni modifiées. Cette mission prépare les fichiers du projet, elle ne publie ni dépôt ni site.
