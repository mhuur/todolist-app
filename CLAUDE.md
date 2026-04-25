# todolist-app

App web personnelle (todo + deadlines + CRM fournisseurs/produits + Notes).

## Stack & structure

- **Tout dans `index.html`** (~135 KB, vanilla JS, monolithique, pas de build).
- **Firebase v8 compat** chargé via CDN : Auth (Google) + Firestore (`users/{uid}`).
- **Cache local** : `localStorage["todolist-data-v3"]` (constante `SK`).
- **Hébergement** : page statique servie depuis `main` (GitHub Pages / équivalent).
- Fichiers : `index.html`, `README.md`, `LICENSE`, `.gitignore`. Rien d'autre.

## Conventions

- **Identifiants ultra-courts** (le code est dense par choix) : état global `S`, helpers `gid()`, `esc()`, `save()`, `render()`. Render par onglet : `rGT` (tâches du jour), `rDN` (deadlines), `rTM` (templates), `rCRM`, `rFB` (Notes), `rTR` (corbeille).
- **Pattern de rendu** : `render()` reconstruit tout `app.innerHTML`. Pas de diff, pas de framework.
- **Saisie** :
  - `oninput` (sans re-render) quand l'identité du champ est un **id stable** (texte, étapes…). Préserve le focus.
  - `onchange` (avec re-render) quand l'identité **est** la valeur (renames de produits, etc.).
- **Échappement** : toute valeur dynamique injectée dans du HTML passe par `esc()`.
- **Icônes** : SVG inline dans `SB_ICONS`. Onglets déclarés dans le tableau passé à la sidebar.
- **Branches Git** : travail Claude sur `claude/<slug>` ; merge squash dans `main` uniquement sur demande explicite ("pousse").
- **Commits** : message court à l'impératif, en anglais, préfixe type `feat:` / `fix:` / `docs:`.

## Commandes utiles

Pas de build, pas de tests, pas de lint. Pour itérer en local :

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

Pour pousser sans clé de signature locale, passer par le MCP GitHub (`push_files`) — fait côté serveur, signature OK.

## Pièges spécifiques

- **Persistance à 6 endroits** : tout nouveau champ ajouté à `S` doit être propagé dans **toutes** ces zones, sinon perte au reload ou à la sync :
  1. `loadFromCloud` (lecture Firestore)
  2. Écriture cache localStorage juste après le load cloud
  3. Bloc de migration premier login
  4. Fallback `catch` localStorage
  5. `saveToCloudNow` (objet `data`)
  6. `save()` (écriture localStorage)
- **Re-render pendant la frappe** = perte de focus. Ne jamais appeler `render()` depuis un `oninput` sur un champ à id stable.
- **Renames** : un rename de produit doit aussi mettre à jour `S.crm.suppliers[].products`, `S.crm.preferred`, et les clés d'expansion `S.ex` dérivées du nom.
- **Firebase v8** (pas v9 modulaire) — garder l'API `firebase.auth()`, `db.collection(...)`. Pas de `import`.
- Pas de `bundler`, pas de TypeScript : tout reste en JS plain dans la balise `<script>`.

## Ne pas toucher sans demande

- **Structure mono-fichier** : ne pas éclater `index.html` en modules.
- **`LICENSE`**.
- **Schéma de cache** `todolist-data-v3` : changer le suffixe casserait les caches existants des users.
- **Config Firebase** dans `index.html` (clé publique, restrictions côté Firebase).
- **Convention de noms courts** : ne pas "renommer pour la lisibilité" `S`, `rGT`, etc.
