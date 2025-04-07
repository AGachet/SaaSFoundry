# Scripts de Gestion des Versions

Ce dossier contient les scripts de gestion des versions pour le projet BillMate Frontend.

## Scripts Disponibles

- `tag-manager.sh` : Gestionnaire principal des versions et des tags Git

## Fonctionnement

Le système de gestion des versions est automatiquement activé lorsque vous travaillez sur une branche dont le nom commence par `rc-` (Release Candidate).

### Processus de Version

1. Créez une branche avec le préfixe `rc-` (ex: `rc-feature/new-ui`)
2. Lorsque vous poussez votre branche (`git push`), le système vous demandera si vous souhaitez mettre à jour la version
3. Choisissez le type de mise à jour :

   - `patch` : Corrections de bugs (1.0.0 → 1.0.1)
   - `minor` : Nouvelles fonctionnalités rétrocompatibles (1.0.0 → 1.1.0)
   - `major` : Changements incompatibles (1.0.0 → 2.0.0)
   - `custom` : Version personnalisée

4. Pour les versions non personnalisées, choisissez le statut de pré-release :
   - `none` : Version stable
   - `alpha` : Tests internes précoces
   - `beta` : Tests publics mais instables
   - `rc` : Candidate à la publication

### Format des Versions

Les versions suivent le format `X.Y.Z[-prerelease]` où :

- X : version majeure (changements incompatibles)
- Y : version mineure (nouvelles fonctionnalités rétrocompatibles)
- Z : version patch (corrections de bugs)
- prerelease : optionnel (alpha, beta, rc)

## Installation

Le système est automatiquement configuré lors de l'installation du projet via `npm install`. Les scripts sont rendus exécutables automatiquement.

## Dépannage

Si vous rencontrez des problèmes avec les scripts :

1. Vérifiez que les scripts sont exécutables :

   ```bash
   chmod +x scripts/*.sh
   ```

2. Réinstallez Husky :

   ```bash
   npx husky install
   ```

3. Vérifiez que les hooks sont exécutables :
   ```bash
   chmod +x .husky/*
   ```
