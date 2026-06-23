# todolist-app

App web personnelle (todo + deadlines + CRM fournisseurs/produits + Notes). **Mono-utilisateur** (Google Auth, doc Firestore `users/{uid}`). **Production**, page statique servie depuis `main` (GitHub Pages / équivalent).

## Stack & structure

- **Tout dans `index.html`** (monolithique, pas de build, pas de tests, pas de lint). Majorité en **vanilla JS** (un gros `<script>`) ; l'onglet **Flux** est un composant **React** dans un `<script type="text/babel" id="flux-src">` compilé en navigateur (React+Babel lazy-loadés).
- **Firebase v8 compat** chargé via CDN (`firebase.auth()`, `db.collection(...)`). **Ne pas migrer vers v9 modulaire.**
- **Cache local** : `localStorage["todolist-data-v3"]` (constante `SK`). Changer le suffixe casse tous les caches.
- Fichiers : `index.html`, `README.md`, `LICENSE`, `.gitignore`. Rien d'autre.

## Carte de l'app — menu & fonctionnalités

**Sidebar** (tableau `tabs`, dispatch `S.tab` → renderer). `sT(k)` change d'onglet. **Onglet par défaut : Flux.**

1. **Flux** (`tab:"flux"` → composant React `class Flux`, monté dans `#flux-root` ; React+Babel lazy-loadés au 1er affichage) — **gestionnaire de tâches principal de l'app**. Données = blob `S.flux` (pont `__fluxLoad`/`__fluxSave`, persisté avec le reste ; cache localStorage `flux_proto_v6`). Multi-**projets** : `S.flux={…, projects:[{id,name,categories,people,tasks,collapsed,filters}], currentProjectId}` — catégories/personnes/tâches **par projet** ; sélecteur de projet en haut (recherche + créer-si-absent + menu ⋮ renommer/supprimer). Migration auto de l'ancien format à plat → un projet « Projet 1 ». Table groupée par catégorie/personne/statut ; filtres dans la sidebar gauche (master « Toutes les tâches » tri-état `bulk` : `null`/`'all'`/`'none'`) ; panneau détail à droite (notes + **tâches filles** + **tâches mères** dérivées). **Interdépendances** : chaque tâche porte `deps[]` = ses prérequis, édités comme « tâches filles » dans le panneau (combobox lier une tâche existante / créer, **anti-cycle** : le picker masque toute cible qui boucle ; helpers `addChild`/`addChildNew`/`removeChild`/`mutProjectOf`/`dependsOn`). Les « **tâches mères** » sont l'**inverse** de `deps` (tâches qui ont la courante comme prérequis = qu'elle débloque) : section **affichée seulement si non vide**, navigation au clic + ✕ détache (`removeChild(mère, courante)`) ; **pas de combobox d'ajout** côté mère — l'autorité d'édition reste la section filles. Colonne « **Niveau** » (`taskLevels`, par projet) = profondeur de blocage : **0 = aucun prérequis non terminé** (à faire en premier, badge vert), sinon `1+max(niveau des bloqueurs)` ; une fille **`status:'done'` ne bloque plus** (la tâche peut retomber à 0). Sens : ajouter une fille à A écrit dans `A.deps` (A bloquée par sa fille) → l'objectif global porte le niveau le **plus haut**, les feuilles sont à 0. *(Retirés : ancienne colonne « Bloquée par » + blocage par catégorie entière `cat:…` — les vieux `cat:` deps deviennent inertes. L'ancienne **checklist d'actions** du panneau est conservée mais **dormante** — données préservées, UI remplacée par les tâches filles.)* Le picker Personne suggère les personnes de **tous** les projets. **Onglet « Aujourd'hui »** (`tab:"today"`, sidebar principale, à côté de Flux) : chaque tâche porte un flag `today` (étoile ☆/★ par ligne dans Flux). C'est un **onglet à part entière**, pas un sous-mode de Flux : il monte **le même composant React `Flux`** dans `#flux-root` avec la prop **`todayOnly`**. En mode `todayOnly`, la top bar et le rail **de Flux** sont masqués et **remplacés par des versions propres à Aujourd'hui** : (1) une **top bar Aujourd'hui** = titre/compteur + ajout rapide (`onTodayQuickAdd`) avec un `<select>` « projet de destination » → `addTodayTask(projId,title)` crée une tâche déjà `today:true` dans le projet choisi (courant ou autre) ; (2) un **rail de filtres** cross-project — **Statut / Projet / Personne** (PAS Catégories, qui sont par-projet et ne mappent pas ; Personne dédupliquée **par nom** via `entryPName`) ; (3) un **en-tête de colonnes** (`todayColHeaderStyle`) aligné sur les lignes (Tâche/Projet/Échéance/Personne/Statut, `gap:10px`). État de filtre **transient, non persisté** : `todayFilters={status,proj,person}` (+ `todayAddProj`) dans `runtime` (comme `bulk`) ; `toggleTodayFilter`/`clearTodayFilters`. Câblage : `tabs` contient `{k:"today"}` ; `render()` route `flux` **et** `today` vers `#flux-root` (classe `main-flux`) ; `mountFlux` passe `{todayOnly:S.tab==="today"}`. Switcher entre Flux/Today **remonte** le composant (nouveau `#flux-root`) → relit `S.flux` (pas de perte ; les filtres transient se réinitialisent). Validation + réordonnancement drag & drop **propre à la vue** (`todayOrder`, n'affecte jamais l'ordre de Flux). L'ancienne entrée *★ À traiter aujourd'hui* dans le rail gauche de Flux a été **retirée** (remplacée par l'onglet). Les lignes de la vue Aujourd'hui sont **éditables inline comme les lignes Flux normales** (titre, échéance, personne, statut) + clic sur le titre = panneau détail (notes + tâches filles) + **badge Niveau** devant le titre (calculé dans le projet de la tâche) + **✕ supprimer au survol** (`askDelete`→modale→`confirmDelete`, cross-project). ⚠️ La modale de confirmation résout son titre via **`taskByIdAny`** (pas `taskById`) sinon une tâche d'un autre projet ne s'afficherait pas. Comme la vue est **multi-projets**, l'édition doit rester *cross-project* : les mutations partagées `patch`/`setStatus`/`patchCheck`/`toggleSelect`/`confirmDelete` cherchent la tâche dans `st.tasks` (projet courant) **puis** dans les autres `st.projects[*].tasks` (helpers `taskByIdAny`/`addPersonTo` pour le détail et l'assignation d'une personne au bon projet) — ne pas les re-restreindre au projet courant. `today`/`todayOrder` vivent dans le blob `S.flux` (persistés sans toucher aux 6 zones vanilla). (Architecture détaillée dans la mémoire `flux-corrective-plan`.)
2. **Temps** (`tab:"time"` → `rTS`) — **feuille de temps hebdo indépendante**, modèle propre `S.timesheet={projects:[{id,name,tasks[]}], weeks:{[lundiISO]:[{projId,rows:[{taskId,h:[7]}]}]}}`. Projets (repliables) → tâches → heures/jour ; somme par projet ; navigation semaine (`S.wo`) ; reprise (prefill) des projets de la semaine précédente, matérialisée à la 1re édition ; ajout/retrait/renommage projets & tâches (`ts*` helpers). Saisie des heures via `oninput`+recalc DOM ciblé (pas de re-render → focus/tab préservés). **Aucun lien** avec Flux ni le modèle legacy.
3. **CRM** (`tab:"crm"` → `rCRM`) — 2 vues `S.crmView` : **Fournisseurs** / **Produits**. Fournisseur = `{name, products[], contacts[]}` ; `S.crm.preferred`. Sync Google Contacts (People API, scope `contacts.readonly`, bouton « Resync », matching via `crmMatchOrg`/`contactAlias`). Autocomplete produits via les helpers partagés `acOpen`/`acFilter` (`ac*`, hérités de l'ancien onglet Tâches — toujours vivants, ne pas casser).
4. **Prix** (`tab:"price"` → `rPL`) — Bibliothèque de prix (vue large `main-wide`). Devis `S.priceLib.quotes[]` à N lignes d'équipement (`lines[]`), schémas de champs dynamiques par sous-catégorie `S.priceLib.schemas{}` (form-builder), table filtrable/triable, édition inline, fusion de devis (`plMerge*`), import depuis bloc structuré collé (JSON produit par Claude). Voir « Pièges spécifiques ».
5. **Notes** (`tab:"feedback"` → `rFB`) — Notes & remarques à transmettre à Claude (`S.feedback.items[]`), validables/supprimables, bouton « Copier les actions en cours » (`fbCopy`).
6. **Corbeille** (`tab:"trash"` → `rTR`) — éléments supprimés (`S.trash[]`), restaurer / vider.

> **Ancien onglet « Tâches » supprimé.** Les renderers `rGT`/`rDN`/`rTM` (+ sous-onglets Planning/Projets/Terminé/Temps auto-calculé) ont été retirés du code ; Flux le remplace. Quelques helpers de l'époque survivent (morts mais **entrelacés** avec l'autocomplete `ac*` encore utilisé par le CRM, et des `let` top-level `_acSel`/`addCard` lus par `acFilter`) — ne pas supprimer à l'aveugle. Le modèle legacy `S.projects` (Action/Projet) n'est plus rendu nulle part ; il ne subsiste que via `S.trash`/`S.archive` (Corbeille).

**Modèle de données** (état global `S` ; persisté : `projects, trash, archive, globalOrder, crm, feedback, priceLib, flux, timesheet`) :
- **`S.flux`** : voir onglet Flux (multi-projets, par-projet). **`S.timesheet`** : voir onglet Temps.
- **Action** (legacy, plus rendu) : `{id, title, text, urgency, status:"todo"|"done", deadline, scheduledDate, waitReason, timeH, doneDate, taskId, paused, priority}`.
- **Projet** (legacy) : `{id, number, name, deadline, actions[], tasks:[{id,title}]}`. Inbox réservée `__inbox`. Ne survit que pour `S.trash`/`S.archive`.
- `globalOrder[]`, `openProjects`/`openTasks`/`ex` = états legacy de l'ancien onglet Tâches (plus utilisés à l'écran).

## Commandes utiles

```bash
py -m http.server 8000                    # puis http://localhost:8000
grep -nE "^function r[A-Z]" index.html    # liste les renderers (rXX)
grep -n "^// ▼ " index.html               # liste les ancres (à poser au fil des ajouts)
```

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
- **Recherche dans une liste : interdiction de `<datalist>`** — la « bulle blanche » native du navigateur est hors thème et a été explicitement rejetée. Pour tout champ « liste + recherche libre » (filtre, autocomplétion, picker), utiliser le combobox custom `.pl-combo-*` (cf. Bibliothèque de prix) : input + dropdown `position:absolute` thème dark, items cliquables via `onmousedown` + `preventDefault` (sinon le blur ferme avant le click). État global transient `{key, query}` partagé entre tous les comboboxes (un seul ouvert à la fois).
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
  - **Propagation** : la première zone migrée au pattern néon devient la référence vivante. **Référence actuelle : la carte de création** — `.qa-trigger` (bleu primary repos+glow), `.qa-add` (vert succès), `.pa-add` (lien pointillé bleu). S'en inspirer pour les prochaines migrations. ⚠️ `.btn-add-neon`/`.btn-neon` cités ci-dessus **ne sont pas encore implémentés** dans le CSS. Dès qu'un toggle/bouton non conforme apparaît ailleurs, **proposer la conversion**.

## Pièges spécifiques

- **Modèle `S.priceLib.quotes[]`** : un devis porte `lines:[{id,product,values}]` (N équipements sous 1 réf/dossier) + `projet` (texte). Les champs legacy `product`/`values` au niveau devis sont un **miroir de la 1re ligne** (compat tableau, pas encore retirés). Migration additive idempotente via `plMigrateLines` (appelée par `plEnsure`). Champs texte de saisie : `oninput` ne re-render JAMAIS (suggestions via combobox `.pl-combo-static` + CSS `:focus-within`).
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
- **`<input type="date">` + re-render sur `oninput`** : à chaque keystroke (chiffre du jour/mois/année), `oninput` se déclenche → si on re-render, le widget date du navigateur est réinitialisé entre deux chiffres et la saisie devient impossible. Toujours utiliser `onchange` (déclenché une fois la date complète, au blur). Pareil pour `type="time"` / `type="datetime-local"`.
- **Composant stateful + focus restore = boucle de re-init** : un composant qui (1) maintient un state global (ex. `plCombo={key,query}`), (2) ré-installe son focus en fin de `render()`, et (3) reset son state dans son handler `onfocus` → boucle infinie (re-render → focus restore → onfocus → reset state → re-render…). Garde-fou : l'opération d'**ouverture** doit être idempotente sur la même cible — `function open(key){if(state&&state.key===key)return; state={key,query:""}; reRender();}`. Sans ce guard, le `query` se vide à chaque keystroke ou la perf s'effondre.
- **Firebase v8** (pas v9 modulaire) — garder l'API `firebase.auth()`, `db.collection(...)`. Pas de `import`.
- Pas de `bundler`, pas de TypeScript : tout reste en JS plain dans la balise `<script>`.

## Ne pas toucher sans demande

- **Structure mono-fichier** : ne pas éclater `index.html` en modules.
- **`LICENSE`**.
- **Schéma de cache** `todolist-data-v3` : changer le suffixe casserait les caches existants des users.
- **Config Firebase** dans `index.html` (clé publique, restrictions côté Firebase).
- **Convention de noms courts** : ne pas "renommer pour la lisibilité" `S`, `rGT`, etc.
- **Migration Firebase v8 → v9 modulaire**.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
