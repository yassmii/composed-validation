# Ajout du profil patrimonial — 4 novembre 2026

## Livrable et verrou

Profil `wealth-advisory/conformance@0.1.0`, contrat `wealth-advisory@0.1.0` draft,
format 0.2. La source est le commit Composed poussé
`a6c6a7c3fb6e540913376c326a3b130af6d147e5`, blob
`63ee2c21a1d928fa79207448de6d165d41d62f9c`, SHA-256
`d51dcabc5031a5f8cb75e374daeeef303c65e2821efd8670d9ced4c7c601265f`.
Les huit jobs CI Composed ont réussi pour ce commit :
[run 41844198899](https://github.com/yassmii/composed/actions/runs/41844198899).

La [suite](../suites/wealth-advisory/0.1.0/README.md) comprend 26 groupes d'acceptation,
54 combinaisons méthode/frontière/type de cas et une matrice de 71 identifiants :
45 clauses normatives plus 26 identifiants d'acceptation. Toutes ces lignes sont
**planned** ; aucune application patrimoniale ni revue humaine produit exécutée.
Le profil et le package de validation gardent leurs versions indépendantes du contrat.

## Contrôles du validateur

Le parseur YAML est verrouillé à `yaml@2.9.0` pour lire les `verifies` et exigences
de preuve du format 0.2. Les gardes supplémentaires refusent une omission de
dimension, une frontière affaiblie, une revue humaine remplacée, une clause ajoutée
par la suite, un passage source fabriqué ou une sélection incomplète de cas.
Les formats antérieurs conservent leurs règles indépendantes.

| Exécution réelle | Résultat |
| --- | --- |
| `npm run validate`, Linux Node 24.15.0 | Verrous, suites et profils valides ; **49 tests réussis**, zéro ignoré. |
| `npm run validate`, Windows Node 24.13.1 | Même résultat : **49 tests réussis**, zéro ignoré. |
| `node --test test/wealth.test.mjs`, Linux | **8 tests réussis**, y compris les mutations des exigences de preuve et les références arithmétiques. |
| Préservation | Tous les verrous précédents, suites et profils existants sont inchangés. |

Les références numériques sont réconciliées indépendamment en centimes entiers :
quotes-parts, enveloppe, budget, change et projection défavorable. Ce contrôle
vérifie les fixtures attendues, pas un moteur patrimonial réel. La revue des modèles
spécialisés et des rapports ne peut pas être remplacée par ces calculs.

Les [empreintes des artefacts sélectionnés et limites](wealth-advisory-checks-2026-11-04.json)
accompagnent ce résumé local non signé. La relecture est celle de l'auteur
(`self-review`) ; aucune indépendance de revue n'est revendiquée.

## Suite

Au moment des vérifications ci-dessus, les changements étaient locaux et non commités ;
le propriétaire a ensuite demandé leur commit. Ils n'ont changé ni les exigences Composed publiées ni les versions des
anciens consommateurs. Pour une exécution produit future, fournir un candidat
immuable, son adaptateur public, les facilités de faute/concurrence/restauration
reproductibles, un runner et les preuves de revue externe. Les absences demeurent
blocked ou not_run ; aucun rapport de conformité ne découle du scaffolding.
