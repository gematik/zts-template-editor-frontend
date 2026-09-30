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

import { ref, computed, watch, unref } from 'vue';
import type { MaybeRef } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './useAuth';
import { useUserinfo } from './useUserinfo';
import { getWorkspaceDetails, commitWorkspace, commitWorkspaceReview } from '../api/workspaces';
import { fmtDate, limitMd } from '../utils/utils';
import type {
  WorkspaceDetails,
  CommitChange,
  VersionItem,
  BranchItem,
  StatusMessageState,
  TemplateMarkdownState,
  TemplateJsonState,
} from '../types';
import { fetchDefaultBranchVersions, fetchDefaultBranch } from '../services/projectService';
import { logger } from '../utils/logger';
import { toErrorStatusMessage, toSuccessStatusMessage } from '../utils/apiErrorPresentation';
import {
  CREATE_MODES,
  DEFAULT_TEMPLATE_TAB,
  EMPTY_STATUS_MESSAGE,
  LOGIN_REQUIRED_MESSAGE,
  MISSING_WORKSPACE_MESSAGE,
  MODE_CREATE_FROM,
  MODE_EDIT,
  PREVIOUS_VERSION_WARNING_LOAD_FAILED,
  type PreviousVersionState,
  type TemplateTab,
} from './templatesManagement/constants';
import { analyzePreviousPackageData, sortVersionsDescending } from './templatesManagement/previousVersions';
import { buildSaveMessage, getEffectiveDefaultBranch, getSaveContext, isProtectedBranch } from './templatesManagement/branching';
import { clearLoadedTemplateState, clearPreviousVersionState, resetStatusMessage } from './templatesManagement/state';
import { mapTemplateJsonStates, mapTemplateMarkdownStates, toLoadedPackageData, type LoadedPackageData } from './templatesManagement/mappers';

export type VersionMode = 'create' | 'createFrom' | 'edit';

const templatesLogger = logger.scope('useTemplatesManagement');

/**
 * Returns whether the current mode requires an existing workspace and version from the route.
 */
function requiresExistingWorkspace(mode: VersionMode): boolean {
  return mode === MODE_EDIT || mode === MODE_CREATE_FROM;
}

/**
 * Manages template loading, save flows and mode-specific state for the template form.
 */
export function useTemplatesManagement(mode: MaybeRef<VersionMode> = MODE_EDIT) {
  const { isReviewer } = useUserinfo();
  const { isLoggedIn, router } = useAuth();
  const route = useRoute();

  const currentMode = computed<VersionMode>(() => unref(mode) ?? MODE_EDIT);
  const projectId = computed(() => String(route.params.projectId));
  const packageName = computed(() => String(route.params.packageName));
  const version = computed(() => (requiresExistingWorkspace(currentMode.value) ? String(route.params.version) : ''));

  const selectedBranch = ref<string>('');
  const defaultBranch = ref<BranchItem | null>(null);
  const workspaceDetails = ref<WorkspaceDetails | null>(null);
  const isVersionReleased = ref(false);
  const loadedPackageData = ref<LoadedPackageData | null>(null);
  const templateMarkdownStates = ref<TemplateMarkdownState[]>([]);
  const templateJsonStates = ref<TemplateJsonState[]>([]);
  const saving = ref(false);
  const tab = ref<TemplateTab>(DEFAULT_TEMPLATE_TAB);
  const loadingDetails = ref(false);
  const statusMessage = ref<StatusMessageState>({ ...EMPTY_STATUS_MESSAGE });
  const previousVersions = ref<VersionItem[]>([]);
  const previousVersionState = ref<PreviousVersionState>('loading');
  const previousVersionSelected = ref<string | null>(null);
  const previousVersionWarnings = ref<{ warnings: string[]; version: string } | null>(null);

  const resettableTemplateState = {
    workspaceDetails,
    loadedPackageData,
    templateMarkdownStates,
    templateJsonStates,
  };

  const hasDetails = computed(() => !!workspaceDetails.value && !loadingDetails.value);

  watch(
    [currentMode, () => route.params.workspace],
    ([activeMode, workspace]) => {
      selectedBranch.value = requiresExistingWorkspace(activeMode) ? String(workspace || '') : '';
    },
    { immediate: true }
  );

  const shouldEditViaFeatureBranch = computed(() => {
    return currentMode.value === MODE_EDIT && isProtectedBranch(selectedBranch.value) && isVersionReleased.value;
  });

  const canEdit = computed(() => {
    if (isReviewer.value) return false;
    if (CREATE_MODES.has(currentMode.value)) return true;
    if (shouldEditViaFeatureBranch.value) return true;
    return !!selectedBranch.value && !isProtectedBranch(selectedBranch.value);
  });

  const canApprove = computed(() => isReviewer.value);

  /**
   * Clears the current status message so the UI can render a neutral state.
   */
  function clearStatus() {
    resetStatusMessage(statusMessage);
  }

  /**
   * Applies loaded workspace details and maps backend payloads into UI-friendly state objects.
   */
  function applyWorkspaceDetails(details: WorkspaceDetails) {
    workspaceDetails.value = details;
    loadedPackageData.value = toLoadedPackageData(details);
    templateMarkdownStates.value = mapTemplateMarkdownStates(details.templatesMd ?? []);
    templateJsonStates.value = mapTemplateJsonStates(details.templatesJson ?? []);
  }

  /**
   * Checks whether the currently edited version already exists on the default branch.
   */
  async function determineIfVersionReleased() {
    templatesLogger.debug('Check whether the latest version has already been released.', {
      selectedBranch: selectedBranch.value,
      defaultBranch: getEffectiveDefaultBranch(defaultBranch.value?.branch),
      version: version.value,
    });

    if (selectedBranch.value === getEffectiveDefaultBranch(defaultBranch.value?.branch)) {
      isVersionReleased.value = true;
      return;
    }

    try {
      const defaultBranchDetails = await getWorkspaceDetails({
        repositoryId: projectId.value,
        branch: getEffectiveDefaultBranch(defaultBranch.value?.branch),
        packageName: packageName.value,
        version: version.value,
      });
      isVersionReleased.value = !!defaultBranchDetails?.packageTemplateJson;
    } catch (error) {
      templatesLogger.error('Error loading the default branch details.', error);
      isVersionReleased.value = false;
    }
  }

  /**
   * Loads workspace details for edit-like modes and resets stale state before the request starts.
   */
  async function loadDetails() {
    templatesLogger.debug('Workspace details are loading.', {
      mode: currentMode.value,
      projectId: projectId.value,
      packageName: packageName.value,
      version: version.value,
      selectedBranch: selectedBranch.value,
      isLoggedIn: isLoggedIn.value,
    });

    if (!isLoggedIn.value) {
      clearLoadedTemplateState(resettableTemplateState);
      return;
    }

    if (!requiresExistingWorkspace(currentMode.value) || !selectedBranch.value) {
      clearLoadedTemplateState(resettableTemplateState);
      return;
    }

    loadingDetails.value = true;
    clearLoadedTemplateState(resettableTemplateState);

    try {
      const details = await getWorkspaceDetails({
        repositoryId: projectId.value,
        branch: selectedBranch.value,
        packageName: packageName.value,
        version: version.value,
      });

      // Set InputFiles to empty list - new version don't have input files
      if (unref(mode) === MODE_CREATE_FROM) {
        templatesLogger.debug('Remove existing inputFiles')
        details.inputFiles = [];
      }

      templatesLogger.debug('Workspace details have been successfully loaded.', {
        templatesMdCount: (details.templatesMd ?? []).length,
        templatesJsonCount: (details.templatesJson ?? []).length,
      });

      applyWorkspaceDetails(details);

      if (currentMode.value === MODE_EDIT) {
        await determineIfVersionReleased();
      }
    } catch (error: any) {
      templatesLogger.error('Error loading workspace details.', error);
      statusMessage.value = toErrorStatusMessage(error, 'Die Details konnten nicht geladen werden.');
      clearLoadedTemplateState(resettableTemplateState);
    } finally {
      loadingDetails.value = false;
    }
  }

  /**
   * Starts a review for the current version without creating a commit.
   */
  async function startReviewWithoutCommit(
    currentPkgVersion: string
  ) {
    if (!isLoggedIn.value) {
      statusMessage.value = toErrorStatusMessage({ message: LOGIN_REQUIRED_MESSAGE }, LOGIN_REQUIRED_MESSAGE);
      return;
    }

    if (!canEdit.value || saving.value) {
      templatesLogger.debug('Skip saving.', { canEdit: canEdit.value, saving: saving.value });
      return;
    }

    saving.value = true;
    statusMessage.value = { ...EMPTY_STATUS_MESSAGE };

    try {
      templatesLogger.debug('The review process is being prepared.', {
        currentPkgVersion,
        mode: currentMode.value,
      });

      const saveContext = getSaveContext({
        mode: currentMode.value,
        selectedBranch: selectedBranch.value,
        currentPkgVersion,
        routeVersion: version.value,
        shouldEditViaFeatureBranch: shouldEditViaFeatureBranch.value,
      });

      const title = `Review of ${saveContext.targetVersion}`;

      templatesLogger.debug('The review request is sent to the backend.', {
        targetBranch: saveContext.targetBranch,
        targetVersion: saveContext.targetVersion,
        title,
      });

      await commitWorkspaceReview({
        repositoryId: projectId.value,
        branch: saveContext.targetBranch,
        title,
      });

      templatesLogger.info('The review operation was completed successfully.', {
        targetBranch: saveContext.targetBranch,
        targetVersion: saveContext.targetVersion,
      });
      statusMessage.value = toSuccessStatusMessage('Der Review wurde erfolgreich gestartet.');

      await loadDetails();
    } catch (error: any) {
      templatesLogger.error('The save operation failed.', error);
      const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
      statusMessage.value = toErrorStatusMessage(
        { message: `Beim Starten des Reviews ist ein Fehler aufgetreten.${detail}` },
        `Beim Starten des Reviews ist ein Fehler aufgetreten.`
      );
    } finally {
      saving.value = false;
    }
  }

  /**
   * Persists the current package changes and redirects when a new feature branch/version was created.
   */
  async function performSave(
    commitChanges: CommitChange[],
    currentPkgVersion: string,
    createMergeRequest: boolean
  ) {
    if (!isLoggedIn.value) {
      statusMessage.value = toErrorStatusMessage({ message: LOGIN_REQUIRED_MESSAGE }, LOGIN_REQUIRED_MESSAGE);
      return;
    }

    if (!canEdit.value || saving.value) {
      templatesLogger.debug('Skip saving.', { canEdit: canEdit.value, saving: saving.value });
      return;
    }

    saving.value = true;
    statusMessage.value = { ...EMPTY_STATUS_MESSAGE };

    try {
      templatesLogger.debug('The save process is being prepared.', {
        commitChangesCount: commitChanges.length,
        currentPkgVersion,
        createMergeRequest,
        mode: currentMode.value,
      });

      const saveContext = getSaveContext({
        mode: currentMode.value,
        selectedBranch: selectedBranch.value,
        currentPkgVersion,
        routeVersion: version.value,
        shouldEditViaFeatureBranch: shouldEditViaFeatureBranch.value,
      });

      const message = buildSaveMessage({
        isCreateMode: saveContext.isCreateMode,
        saveOnFeatureBranch: saveContext.saveOnFeatureBranch,
        isVersionReleased: isVersionReleased.value,
        routeVersion: version.value,
        packageName: packageName.value,
        targetVersion: saveContext.targetVersion,
        targetBranch: saveContext.targetBranch,
      });

      templatesLogger.debug('The commit is sent to the backend.', {
        targetBranch: saveContext.targetBranch,
        targetVersion: saveContext.targetVersion,
        createMergeRequest,
        commitChangesCount: commitChanges.length,
      });

      await commitWorkspace({
        repositoryId: projectId.value,
        branch: saveContext.targetBranch,
        packageName: packageName.value,
        version: saveContext.targetVersion,
        message,
        changes: commitChanges,
        createMergeRequest,
      });

      templatesLogger.info('The save operation was completed successfully.', {
        targetBranch: saveContext.targetBranch,
        targetVersion: saveContext.targetVersion,
      });
      statusMessage.value = toSuccessStatusMessage(message);

      if (saveContext.isCreateMode || saveContext.saveOnFeatureBranch) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await router.push({
          name: 'versionDetails',
          params: {
            projectId: projectId.value,
            packageName: packageName.value,
            version: saveContext.targetVersion,
            workspace: saveContext.targetBranch,
          },
        });
        return;
      }

      await loadDetails();
    } catch (error: any) {
      templatesLogger.error('The save operation failed.', error);
      const action = CREATE_MODES.has(currentMode.value) ? 'Erstellen' : 'Speichern';
      const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
      statusMessage.value = toErrorStatusMessage(
        { message: `Beim ${action} ist ein Fehler aufgetreten.${detail}` },
        `Beim ${action} ist ein Fehler aufgetreten.`
      );
    } finally {
      saving.value = false;
    }
  }

  /**
   * Appends a new empty markdown template entry to the editable list.
   */
  function addMarkdownTemplate() {
    templateMarkdownStates.value.push({
      originalCanonicalUrl: undefined,
      canonicalUrl: '',
      originalVersion: undefined,
      version: '',
      markdown: '',
    });
  }

  /**
   * Removes a markdown template entry by index when the index is within bounds.
   */
  function removeMarkdownTemplate(index: number) {
    if (index >= 0 && index < templateMarkdownStates.value.length) {
      templateMarkdownStates.value.splice(index, 1);
    }
  }

  /**
   * Builds warning information for create-from mode based on the loaded source version.
   */
  function applyCreateFromWarnings() {
    if (currentMode.value !== MODE_CREATE_FROM) return;

    previousVersionWarnings.value = loadedPackageData.value
      ? analyzePreviousPackageData(loadedPackageData.value, version.value)
      : { warnings: [PREVIOUS_VERSION_WARNING_LOAD_FAILED], version: '' };
  }

  /**
   * Moves the previous-version selector into a loading state before branch data is fetched.
   */
  function startCreateModeVersionLoading() {
    if (previousVersions.value.length === 0) {
      previousVersionState.value = 'loading';
    }
  }

  /**
   * Applies and sorts available versions from the default branch for create-mode workflows.
   */
  function applyLoadedDefaultBranchVersions(versions: VersionItem[]) {
    previousVersions.value = sortVersionsDescending(versions ?? []);
    previousVersionSelected.value = version.value || null;
    previousVersionState.value = previousVersions.value.length > 0 ? 'loaded' : 'noVersions';
  }

  /**
   * Handles errors while loading default-branch versions for create-mode workflows.
   */
  function handleDefaultBranchVersionsError(error: unknown) {
    templatesLogger.error('Error loading the default branch versions.', error);
    defaultBranch.value = null;
    clearPreviousVersionState({ previousVersions, previousVersionSelected });
    previousVersionState.value = 'error';
  }

  /**
   * Handles errors while resolving the default branch metadata for edit mode.
   */
  function handleDefaultBranchInfoError(error: unknown) {
    templatesLogger.error('Error loading default branch information.', error);
    defaultBranch.value = null;
  }

  /**
   * Loads default-branch information and available versions required by create and create-from flows.
   */
  async function loadCreateModeBranchData() {
    startCreateModeVersionLoading();

    try {
      const resolvedDefaultBranch = await fetchDefaultBranch(Number(projectId.value));
      defaultBranch.value = resolvedDefaultBranch;

      if (!resolvedDefaultBranch) {
        throw new Error('Kein Default Branch gefunden');
      }

      const versions = await fetchDefaultBranchVersions(Number(projectId.value), resolvedDefaultBranch);
      applyLoadedDefaultBranchVersions(versions ?? []);
    } catch (error) {
      handleDefaultBranchVersionsError(error);
    }
  }

  /**
   * Resolves default-branch metadata once for edit mode so release checks can use it.
   */
  async function loadDefaultBranchInfoForEditMode() {
    if (defaultBranch.value) return;

    try {
      const resolvedDefaultBranch = await fetchDefaultBranch(Number(projectId.value));
      if (!resolvedDefaultBranch) {
        throw new Error('Kein Default Branch gefunden');
      }
      defaultBranch.value = resolvedDefaultBranch;
    } catch (error) {
      handleDefaultBranchInfoError(error);
    }
  }

  /**
   * Clears all state that should not survive a logout or an invalid session.
   */
  function resetAllStateAfterLogout() {
    clearLoadedTemplateState(resettableTemplateState);
    clearPreviousVersionState({ previousVersions, previousVersionSelected });
    clearStatus();
  }

  /**
   * Initializes the composable for the current route and mode and triggers the required data loads.
   */
  function initForMode() {
    if (!isLoggedIn.value) {
      templatesLogger.debug('Not logged in - Initialization will be canceled.');
      clearLoadedTemplateState(resettableTemplateState);
      clearPreviousVersionState({ previousVersions, previousVersionSelected });
      return;
    }

    if (requiresExistingWorkspace(currentMode.value) && !selectedBranch.value) {
      statusMessage.value = toErrorStatusMessage({ message: MISSING_WORKSPACE_MESSAGE }, MISSING_WORKSPACE_MESSAGE);
      return;
    }

    loadDetails()
      .then(() => applyCreateFromWarnings())
      .catch((error) => {
        templatesLogger.error('Error loading details.', error);
      });

    if (CREATE_MODES.has(currentMode.value)) {
      void loadCreateModeBranchData();
      return;
    }

    if (currentMode.value === MODE_EDIT) {
      void loadDefaultBranchInfoForEditMode();
    }
  }

  watch(
    () => isLoggedIn.value,
    (loggedIn) => {
      if (loggedIn) {
        initForMode();
        return;
      }

      resetAllStateAfterLogout();
    },
    { immediate: true }
  );

  watch([currentMode, projectId, packageName, version, () => route.params.workspace], () => {
    if (isLoggedIn.value) {
      initForMode();
    }
  });

  watch([defaultBranch], async () => {
    if (isLoggedIn.value && currentMode.value === MODE_EDIT) {
      await determineIfVersionReleased();
    }
  });

  return {
    mode: currentMode,
    router,
    projectId,
    packageName,
    version,
    defaultBranch,
    isVersionReleased,
    previousVersions,
    previousVersionSelected,
    previousVersionState,
    previousVersionWarnings,
    selectedBranch,
    saving,
    tab,
    loadingDetails,
    statusMessage,
    loadedPackageData,
    workspaceDetails,
    hasDetails,
    templateMarkdownStates,
    templateJsonStates,
    isLoggedIn,
    canEdit,
    canApprove,
    loadDetails,
    startReviewWithoutCommit,
    performSave,
    addMarkdownTemplate,
    removeMarkdownTemplate,
    fmtDate,
    limitMd,
  };
}
