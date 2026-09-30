/*
 * Copyright (Change Date see Readme), gematik GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ******
 *
 * For additional notes and disclaimer from gematik and in case of changes
 * by gematik, find details in the "Readme" file.
 */

import { DEFAULT_BRANCH_FALLBACK, PROTECTED_BRANCHES } from './constants';

/**
 * Checks whether a given branch is protected (e.g. "main" or "dev").
 */
export function isProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCHES.has((branch || '').trim());
}

/**
 * Resolves the effective default branch.
 * Falls back to a predefined default if the provided value is empty or undefined.
 */
export function getEffectiveDefaultBranch(defaultBranchName?: string | null): string {
  return defaultBranchName?.trim() || DEFAULT_BRANCH_FALLBACK;
}

/**
 * Computes the save context based on mode and branching rules.
 *
 * Responsibilities:
 * - Determines whether the operation is a create or edit flow
 * - Resolves the correct target branch (feature branch vs selected branch)
 * - Resolves the effective version to save
 *
 * This function centralizes all branching decisions for save operations.
 */
export function getSaveContext(params: {
  mode: 'create' | 'createFrom' | 'edit';
  selectedBranch: string;
  currentPkgVersion: string;
  routeVersion: string;
  shouldEditViaFeatureBranch: boolean;
}) {
  const isCreateMode = params.mode === 'create' || params.mode === 'createFrom';
  const resolvedVersionForEdit = (params.currentPkgVersion || params.routeVersion).trim();

  let targetBranch = params.selectedBranch;
  if (isCreateMode && params.currentPkgVersion) {
    targetBranch = `feature/${params.currentPkgVersion}`;
  } else if (params.shouldEditViaFeatureBranch) {
    targetBranch = `feature/${resolvedVersionForEdit}`;
  }

  const targetVersion = isCreateMode ? params.currentPkgVersion : resolvedVersionForEdit;

  return {
    isCreateMode,
    saveOnFeatureBranch: params.shouldEditViaFeatureBranch,
    targetBranch,
    targetVersion,
  };
}

/**
 * Builds a user-facing success message after a save operation.
 *
 * The message varies depending on:
 * - create vs edit mode
 * - whether a feature branch was used
 * - whether the version is already released
 *
 * This keeps UI messaging logic separate from business logic.
 */
export function buildSaveMessage(params: {
  isCreateMode: boolean;
  saveOnFeatureBranch: boolean;
  isVersionReleased: boolean;
  routeVersion: string;
  packageName: string;
  targetVersion: string;
  targetBranch: string;
}): string {
  let message = `Das Package für die Version ${params.routeVersion} des FHIR Package ${params.packageName} wurde aktualisiert`;

  if (params.isCreateMode) {
    message = `Neues Package für die Version ${params.targetVersion} des FHIR Package ${params.packageName} auf Branch ${params.targetBranch} erstellt`;
  } else if (params.saveOnFeatureBranch) {
    message = `Für die veröffentlichte Version ${params.targetVersion} des FHIR Package ${params.packageName} wurde eine bearbeitete Fassung auf Branch ${params.targetBranch} erstellt`;
  } else if (params.isVersionReleased) {
    message = `Änderungen für die Version ${params.targetVersion} des FHIR Package ${params.packageName} wurden gespeichert`;
  }

  return message;
}
