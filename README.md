# Palier

Application mobile de coaching sportif : programme d'entraînement et plan nutrition générés chaque semaine, ajustés selon les charges réellement faites et le ressenti.

Ce dépôt part de la maquette conçue sur Claude, transposée en site statique.

## Lancer en local

Aucune dépendance. Depuis la racine du dépôt :

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Structure

- `index.html` : la page
- `css/styles.css` : les styles (thème clair et sombre)
- `js/app.js` : toute l'application (état, écrans, actions)

## Fonctionnalités

- Questionnaire de départ en 11 étapes (profil, objectif, niveau, santé, alimentation…)
- Programme de la semaine, séance guidée avec chrono de repos, saisie des charges
- Nutrition : objectifs caloriques (Mifflin-St Jeor), menus, recettes, courses, journal des repas
- Suivi : poids, mensurations, photos, courbes de charges, bilan hebdomadaire
- Abonnement simulé (aucun paiement réel)

## Limites actuelles

- **IA** : la maquette utilisait l'IA intégrée à Claude (`window.claude`). Hors de Claude, l'app bascule sur un programme de secours sans IA, et l'analyse des repas se fait par saisie manuelle. Il faudra brancher une API (via un petit backend) pour retrouver la génération par IA.
- **Données** : tout est stocké dans le navigateur (`localStorage`), sans compte ni synchronisation.
