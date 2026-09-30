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

import type { Ref } from 'vue';
import type {
  TemplateMarkdownState,
  TemplateJsonState,
  WorkspaceDetails,
  StatusMessageState,
  VersionItem,
} from '../../types';
import type { LoadedPackageData } from './mappers';
import { EMPTY_STATUS_MESSAGE } from './constants';

export type ResettableTemplateState = {
  workspaceDetails: Ref<WorkspaceDetails | null>;
  loadedPackageData: Ref<LoadedPackageData | null>;
  templateMarkdownStates: Ref<TemplateMarkdownState[]>;
  templateJsonStates: Ref<TemplateJsonState[]>;
};

export type ResettablePreviousVersionState = {
  previousVersions: Ref<VersionItem[]>;
  previousVersionSelected: Ref<string | null>;
};

/**
 * Clears all loaded template-related state.
 *
 * Used when:
 * - switching workspace
 * - logging out
 * - resetting the editor
 */
export function clearLoadedTemplateState(state: ResettableTemplateState) {
  state.workspaceDetails.value = null;
  state.loadedPackageData.value = null;
  state.templateMarkdownStates.value = [];
  state.templateJsonStates.value = [];
}

/**
 * Clears previous version selection and list.
 *
 * Used when leaving "create from version" flows or resetting state.
 */
export function clearPreviousVersionState(state: ResettablePreviousVersionState) {
  state.previousVersions.value = [];
  state.previousVersionSelected.value = null;
}

/**
 * Resets the status message to its default (empty) state.
 *
 * Prevents stale success/error messages from persisting in UI.
 */
export function resetStatusMessage(statusMessage: Ref<StatusMessageState>) {
  statusMessage.value = { ...EMPTY_STATUS_MESSAGE };
}
