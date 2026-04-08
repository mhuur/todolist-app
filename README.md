# 📋 Ma Todolist

Application de gestion de tâches par projets, entièrement côté client (HTML/CSS/JS pur). Aucun serveur, aucune dépendance — un seul fichier `index.html` à ouvrir dans votre navigateur.

## Fonctionnalités

### Projets
- Créer, renommer et supprimer des projets
- Définir une deadline par projet avec indicateur visuel (retard, proche, OK)
- Marquer un projet en **TOP** priorité (badge rouge, classé en premier)
- Trier par deadline ou Z-A (les TOP restent en tête)
- Replier / déplier tous les projets d'un clic
- Réordonner les projets par drag & drop
- Barre de progression par projet

### Actions
- Ajouter des actions à chaque projet
- Degré d'urgence : Haut / Moyen / Faible (code couleur)
- Deadline individuelle par action
- Statuts : en cours, **en attente** (avec raison), **terminée**
- Actions en attente : bordure pointillée + filtre blanchâtre
- Actions terminées : texte barré, grisé, repliées dans un volet déroulant
- Réordonner par drag & drop (y compris entre projets)
- Tri automatique par urgence, les actions en attente après les actives

### Éditeur de texte riche
- Police (Nunito, Merriweather, Fira Code, Caveat, etc.)
- Gras, Italique, Souligné, Barré
- Surlignage avec palette Flash et Pastel
- Coller des images directement (Ctrl+V)
- Barre d'édition visible uniquement au clic dans la zone de texte

### Vue globale
- Toutes les actions regroupées par niveau d'urgence
- Glisser une action d'un groupe à l'autre pour changer sa priorité
- Bouton « Par projet » pour sous-grouper par projet
- Sélecteur de projet pour réattribuer une action
- Volet déroulant pour les actions terminées
- Badge TOP affiché en haut à droite des actions concernées

### Corbeille
- Les projets et actions supprimés vont dans une corbeille
- Restauration ou suppression définitive
- Horodatage relatif (il y a X min / X h)

### Persistance
- Toutes les données sont sauvegardées dans le `localStorage` du navigateur
- Aucune donnée ne quitte votre machine

## Installation

Aucune installation requise.

```bash
git clone https://github.com/VOTRE-USERNAME/todolist-app.git
cd todolist-app
```

Puis ouvrir `index.html` dans votre navigateur.

### Avec un serveur local (optionnel)

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .
```

Puis aller sur `http://localhost:8000`.

## Déploiement GitHub Pages

1. Aller dans les **Settings** du dépôt GitHub
2. Section **Pages**
3. Source : branche `main`, dossier `/ (root)`
4. Votre todolist sera accessible sur `https://VOTRE-USERNAME.github.io/todolist-app/`

## Technologies

- HTML5 / CSS3 / JavaScript vanilla
- Aucun framework, aucune dépendance
- Police [Nunito](https://fonts.google.com/specimen/Nunito) via Google Fonts
- Stockage : `localStorage`

## Licence

MIT — voir [LICENSE](LICENSE)
