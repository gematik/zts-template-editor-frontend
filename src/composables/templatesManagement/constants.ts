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

import type { StatusMessageState } from '../../types';

export type PreviousVersionState = 'loading' | 'error' | 'loaded' | 'noVersions';
export type TemplateTab = 'FHIR-Templates' | 'Webcontent' | 'Downloadbedingungen' | 'Upload Inputdateien';

export const MODE_EDIT = 'edit' as const;
export const MODE_CREATE = 'create' as const;
export const MODE_CREATE_FROM = 'createFrom' as const;
export const CREATE_MODES = new Set<(typeof MODE_EDIT) | (typeof MODE_CREATE) | (typeof MODE_CREATE_FROM)>([MODE_CREATE, MODE_CREATE_FROM]);
export const PROTECTED_BRANCHES = new Set(['dev', 'main']);
export const DEFAULT_BRANCH_FALLBACK = 'dev';
export const DEFAULT_TEMPLATE_TAB: TemplateTab = 'FHIR-Templates';
export const EMPTY_STATUS_MESSAGE: StatusMessageState = { type: null, title: null, message: null, debug: null };
export const PREVIOUS_VERSION_WARNING_LOAD_FAILED = 'Fehler beim Laden der ausgewählten Version.';
export const MISSING_WORKSPACE_MESSAGE = 'Kein Arbeitsbereich in der Route gefunden.';
export const LOGIN_REQUIRED_MESSAGE = 'Sie müssen eingeloggt sein, um Änderungen zu speichern.';
