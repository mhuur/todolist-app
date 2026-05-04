# todolist-app

App web personnelle (todo + deadlines + CRM fournisseurs/produits + Notes). **Mono-utilisateur** (Google Auth, doc Firestore `users/{uid}`). **Production**, page statique servie depuis `main` (GitHub Pages / équivalent).

## Stack & structure

- **Tout dans `index.html`** (~930 lignes, vanilla JS, monolithique, pas de build, pas de tests, pas de lint).
- **Firebase v8 compat** chargé via CDN (`firebase.auth()`, `db.collection(...)`). **Ne pas migrer vers v9 modulaire.**
- **Cache local** : `localStorage["todolist-data-v3"]` (constante `SK`). Changer le suffixe casse tous les caches.
- Fichiers : `index.html`, `README.md`, `LICENSE`, `.gitignore`. Rien d'autre.

## Commandes utiles

```bash
python3 -m http.server 8000               # puis http://localhost:8000
grep -nE "^function r[A-Z]" index.html    # liste les renderers (rXX)
grep -n "^// ▼ " index.html               # liste les ancres (à poser au fil des ajouts)
```

Pour pousser sans clé de signature locale, passer par le MCP GitHub (`push_files`) — fait côté serveur, signature OK.

**Workflow git** : travail Claude sur `claude/<slug>` ; **merge squash dans `main` uniquement sur demande explicite** ("pousse"). Messages courts à l'impératif, en anglais, préfixe type `feat:` / `fix:` / `docs:`.

## Conventions

- **Identifiants ultra-courts** (le code est dense par choix) : état global `S`, helpers `gid()`, `esc()`, `save()`, `render()`. Renderers par onglet : `rGT` (tâches du jour), `rDN` (deadlines), `rTM` (templates), `rCRM`, `rFB` (Notes), `rTR` (corbeille).
- **Pose une ancre `// ▼ <nom>`** au-dessus de toute fonction-clé que tu ajoutes — la nav du fichier en dépend.
- **Pattern de rendu** : `render()` reconstruit tout `app.innerHTML`. Pas de diff, pas de framework.
- **Saisie** :
  - `oninput` (sans re-render) quand l'identité du champ est un **id stable** (texte, étapes…). Préserve le focus.
  - `onchange` (avec re-render) quand l'identité **est** la valeur (renames de produits, etc.).
  - **Jamais `render()` depuis un `oninput`** sur input texte → perte focus garantie. OK depuis `onchange` toggle/select et click button.
- **`esc()` obligatoire** sur toute valeur dynamique injectée en HTML (XSS).
- **Icônes** : SVG inline dans `SB_ICONS`. Onglets déclarés dans le tableau passé à la sidebar.
- **Pop-up : éviter `alert/confirm/prompt` natifs** (style hors-thème). Quelques `confirm()` natifs subsistent (déconnexion, fallback copie) — à migrer vers helpers `uiAlert/uiConfirm/uiPrompt` quand on retouche la zone.
- **Pas d'emoji décoratif** dans les nouvelles UI — privilégier SVG inline. L'app a encore des emojis legacy (titre `🌊`, indicateurs sync `✓ ✗ …`) — à remplacer au fil des retouches.
- **Inputs number sans spinner** — règle CSS globale recommandée : `input[type="number"]{-moz-appearance:textfield;appearance:textfield}` + suppression `::-webkit-inner/outer-spin-button`. Aucune flèche up/down nulle part.
- **Charte CSS variables `:root`** (à mettre en place quand on retouche le style) : espacements (`--space-xs/sm/md/lg/xl`), hauteurs boutons (`--btn-h-sm/md/lg`), rayons (`--radius-sm/md/lg`). Si une valeur revient ≥ 3 fois → variable plutôt qu'inline.
- **Style visuel : néon** — pour toute nouvelle UI ou retouche esthétique (boutons d'action, états colorés, badges interactifs, toggles), privilégier le langage néon plutôt que les fonds pleins ou les pills mates. L'app a actuellement beaucoup de fonds pleins / dégradés (`.bp` linear-gradient bleu) — à migrer au fil des retouches.
  - **Recette repos** : `background:transparent` + `border:1px solid <couleur>` + `box-shadow: inset 0 0 0 1px rgba(<couleur>,.32), 0 0 12px rgba(<couleur>,.22)`.
  - **Hover (pulse)** : 3 layers cumulés `inset 0 0 12px rgba(.22), 0 0 18px rgba(.5), 0 0 32px rgba(.22)` + `background:rgba(<couleur>,.06-.10)` + couleur texte plus claire.
  - **Texte d'état** : `text-shadow:0 0 8px currentColor` sur les éléments porteurs de l'état (icône, label, montant).
  - **Palette cible** : bleu `#38BDF8` (primary, déjà en place), vert `#22C55E` (succès / done), orange `#F59E0B` (warning / wait), rouge `#F87171` (danger / supprimer), violet `#C026D3` (neutre — toggles sans sémantique de couleur). Hover : `#7DD3FC #86EFAC #FCD34D #FCA5A5 #E879F9`.
  - **NE PAS** revenir aux fonds pleins type `background:#0EA5E9` + texte blanc pour de nouveaux boutons. Exception : un bouton de soumission unique dans un formulaire isolé peut rester plein si justifié.
  - **Toggles binaires/ternaires** (filtre statut, vue list/board, tri…) : container `<div class="seg seg-neon">`. Bouton actif = fond plein primary + glow fort + text-shadow blanc, variant `.warn` (orange) pour les états destructeurs. Inactif = ghost discret qui s'éclaire au hover.
  - **Variante `.violet`** pour toggles **neutres** sans sémantique (vue Fournisseurs/Produits, list/board) : fond `rgba(192,38,211,.18)` translucide + inset shadow `rgba(232,121,249,.5)` + glow serré 14 px + texte `#fdf4ff`.
  - **Bouton `+ Ajouter`** : classe générique `.btn-add-neon` (compact ~30 px, bordure néon primary + glow). Toujours préférer cette classe pour les boutons d'ajout.
  - **Bouton d'action primary** : `.btn-neon` (version "lourde", padding 9×16, font-size 13). Pour les boutons d'action principale d'un écran. État `:disabled` (opacité 45 %, glow off).
  - **Propagation** : la première zone migrée au pattern néon (à choisir lors d'une refonte) devient la référence vivante. Dès qu'un toggle/bouton non conforme apparaît ailleurs, **proposer la conversion**.

## Pièges spécifiques

- **Persistance à 6 endroits** : tout nouveau champ ajouté à `S` doit être propagé dans **toutes** ces zones, sinon perte au reload ou à la sync :
  1. `loadFromCloud` (lecture Firestore)
  2. Écriture cache localStorage juste après le load cloud
  3. Bloc de migration premier login
  4. Fallback `catch` localStorage
  5. `saveToCloudNow` (objet `data`)
  6. `save()` (écriture localStorage)
- **Limite Firestore 1 MB par doc** — `users/{uid}` contient TOUT le state. **Ne JAMAIS stocker d'images en data URL inline** (screenshots de notes/feedback, avatars). `stripImgs()` est appelé avant `set()` mais ne couvre pas tout. Symptôme : `saveToCloudNow` échoue silencieusement → cloud gelé, divergence local/prod.
- **Debounce save 1500 ms sans flush beforeunload** — fenêtre de perte si reload/fermeture < 1.5 s après une modif. À durcir si problème : ajouter un `flushSaveBeforeUnload` (clear `saveTimer` + `saveToCloudNow()` synchrone sur `beforeunload`/`pagehide`).
- **Renames** : un rename de produit doit aussi mettre à jour `S.crm.suppliers[].products`, `S.crm.preferred`, et les clés d'expansion `S.ex` dérivées du nom.
- **`JSON.stringify(x)` injecté dans un attribut HTML `onclick="..."`** : les `"` produits par JSON cassent silencieusement l'attribut (handler jamais installé, aucune erreur console). Toujours wrapper : `onclick="fn(${esc(JSON.stringify(x))})"`. `esc()` transforme `"` → `&quot;`, le parseur HTML décode → la string JS arrive intacte.
- **Firebase v8** (pas v9 modulaire) — garder l'API `firebase.auth()`, `db.collection(...)`. Pas de `import`.
- Pas de `bundler`, pas de TypeScript : tout reste en JS plain dans la balise `<script>`.

## Ne pas toucher sans demande

- **Structure mono-fichier** : ne pas éclater `index.html` en modules.
- **`LICENSE`**.
- **Schéma de cache** `todolist-data-v3` : changer le suffixe casserait les caches existants des users.
- **Config Firebase** dans `index.html` (clé publique, restrictions côté Firebase).
- **Convention de noms courts** : ne pas "renommer pour la lisibilité" `S`, `rGT`, etc.
- **Migration Firebase v8 → v9 modulaire**.

## Méthode de travail

- **Découpage en phases** pour toute tâche non triviale : audit / proposition / exécution. Stop explicite à la fin de chaque phase, attente "OK".
- **Audit + proposition obligatoires** pour : navigation/menu, schéma `S`, suppression > 50 lignes, `sed` ou Edit multi-zones.
- **Refonte UX multi-zones en N étapes** : proposer un plan en 3-4 étapes avec validation entre chaque (« étape 1 schéma + helpers / étape 2 zones simples / étape 3 cas complexes / étape 4 cleanup »). Évite les commits monstres.
- **Challenger** bienvenu : propose alternatives/questions, sépare clairement de ce que je demande, indique : maintenant / plus tard / juste à noter.
- **Demander plutôt que deviner** sur les points métier (intentions produit, modèle de données, sémantique d'un statut).
- **Grep avant Edit** : vérifier l'unicité de `old_string` (`grep -c`) avant un Edit. Beaucoup de patterns courts collisionnent dans un mono-fichier. Si non unique, élargir contexte ou cibler via ancre voisine.
- **Sanity check manuel** : recharger localement (`python3 -m http.server`) et vérifier au moins le rendu de l'onglet touché avant de déclarer la tâche finie. Pas de tests automatisés ici.

## Efficacité

- **Grep/glob avant `read`**. Fichier entier seulement si nécessaire — sur `index.html` (~930 lignes), 50 lignes ciblées via ancre suffisent presque toujours.
- **Reads serrés via ancres** : `grep -n "^// ▼ <nom>"` puis `Read offset=<L> limit=80`. Pas 200 lignes par sécurité.
- **Résumer plutôt que citer**. Pas de réaffichage de gros blocs sans nécessité.
- **Grouper les modifs liées dans un seul tour** (un seul `Edit` ou un seul commit cohérent).

## Code mort / obsolète — pas de big-bang

L'utilisateur ne lit pas le code, donc ne peut pas valider ligne par ligne. Sans tests + avec `window.X` exposées via `onclick="..."` strings, le risque de régression silencieuse en supprimant du code "mort" est asymétrique vs le gain de fluidité. Donc :

- **Nettoyage à la marge** : à chaque fois que je touche une zone, je supprime autour le mort évident (helper sans caller, branche commentée, `setTimeout` mort) — tant que c'est local et certain.
- **Audit déclenché par symptôme** : si une zone précise me freine en grep/lecture, je le signale et on cible.
- **Pas de gros nettoyage spéculatif** sans douleur exprimée.

## Auto-maintenance du CLAUDE.md

- **Auto-alimentation** : en fin de tâche, si une convention non documentée, un piège, ou une commande non triviale est apparu → l'ajouter ici en 1–2 lignes max, dans la bonne section. Pas attendre la fin de session.
- **Critère d'ajout strict** : une info entre dans CLAUDE.md uniquement si **(a)** elle n'est pas déductible du code en < 30 s, **ET (b)** elle resservira dans une future session. Sinon, je n'écris rien.
- **Diagnostic périodique** : tous les ~10 commits, relancer un audit obsolescence/doublons/verbeux/trivial et proposer un nettoyage avant exécution.
- **Format** : phrases courtes, listes à puces, code en `backticks`. Pas de « il est important de noter que », « par ailleurs », « en effet ».
- **Délégation** : si l'info est dans le code et triviale à grep → ne pas dupliquer, référencer l'emplacement.

## Fin de session

Mot-clé : **« Kenavo ! »**. Quand l'utilisateur l'écrit, répondre **avant** toute autre chose par :

> Au vu de ce qu'on vient de faire, qu'est-ce qui mériterait d'être ajouté au CLAUDE.md pour qu'une prochaine session démarre mieux ? Propose des ajouts précis avec leur emplacement dans le fichier.

Précis = nouveau bullet, sous-section ou modif d'une règle, avec emplacement exact (section + position). Une fois validé/refusé, l'user fait `/clear`.
