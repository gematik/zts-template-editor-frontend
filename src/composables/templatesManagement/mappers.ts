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

import type {
  PackageModel,
  MetadataFile,
  ChangelogFile,
  MarkdownContent,
  TemplateMarkdownState,
  TemplateJsonState,
  WorkspaceDetails,
  PackageState,
  InputFiles,
} from '../../types';
import { safeParse } from './parsers';

export type LoadedPackageData = PackageState;

/**
 * Maps raw backend workspace details into a normalized package state.
 *
 * Responsibilities:
 * - Safely parses JSON fields from backend
 * - Resolves package name and version with fallbacks across multiple sources
 * - Normalizes all fields into a consistent frontend structure
 *
 * This is the central transformation layer between backend DTOs and UI state.
 */
export function toLoadedPackageData(details: WorkspaceDetails): LoadedPackageData {
  const pkg = safeParse<Partial<PackageModel>>(
    details.packageTemplateJson,
    {} as Partial<PackageModel>
  );

  const meta = safeParse<Partial<MetadataFile>>(
    details.metadatenJson,
    {} as Partial<MetadataFile>
  );

  const changelog = safeParse<Partial<ChangelogFile>>(
    details.changelogsJson,
    {} as Partial<ChangelogFile>
  );

  const resolvedPackageName =
    pkg.packagename ??
    meta['package-name'] ??
    changelog['package-name'] ??
    '';

  const resolvedVersion =
    pkg.version ??
    meta['package-version'] ??
    changelog['package-version'] ??
    '';

  return {
    pkgJson: {
      packagename: resolvedPackageName,
      version: resolvedVersion,
      title: pkg.title ?? '',
      description: pkg.description ?? '',
      author: pkg.author ?? '',
      dependencies: pkg.dependencies ?? '',
      altTitle: pkg.altTitle ?? '',
      keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
      copyright: pkg.copyright ?? '',
    },
    metaJson: meta as MetadataFile,
    changelogsJson: {
      'package-name': changelog['package-name'] ?? resolvedPackageName,
      'package-version': changelog['package-version'] ?? resolvedVersion,
      changes: Array.isArray(changelog.changes) ? changelog.changes : [],
    } as ChangelogFile,
    markdown: {
      external: details.externalSourcesMd ?? '',
      fhir: details.fhirConversionNotesMd ?? '',
      author: details.noteOnAuthorMd ?? '',
      cycles: details.notesOnUpdateCyclesMd ?? '',
      generic: details.descriptionGenericMd ?? '',
    } as MarkdownContent,
    downloadConditions: details.downloadConditionsXml ?? '',
    inputFiles: safeParse<InputFiles[]>(details.inputFiles, [] as InputFiles[]),
  };
}

/**
 * Converts backend markdown template items into editable frontend state.
 *
 * Ensures:
 * - All fields are defined (no null/undefined)
 * - Original values are preserved for change tracking
 */
export function mapTemplateMarkdownStates(
  mdItems: Array<{
    canonicalUrl?: string | null;
    version?: string | null;
    markdown?: string | null;
  }>
): TemplateMarkdownState[] {
  return (mdItems ?? []).map((item) => ({
    originalCanonicalUrl: item.canonicalUrl ?? '',
    canonicalUrl: item.canonicalUrl ?? '',
    originalVersion: item.version ?? '',
    version: item.version ?? '',
    markdown: item.markdown ?? '',
  }));
}

/**
 * Converts backend JSON template items into editable frontend state.
 *
 * Ensures:
 * - JSON is always stored as formatted string
 * - Invalid or missing JSON is normalized
 * - Each entry is marked as initially valid
 */
export function mapTemplateJsonStates(
  jsonItems: Array<{
    name: string;
    json?: unknown;
  }>
): TemplateJsonState[] {
  return (jsonItems ?? []).map((item) => ({
    name: item.name,
    json: typeof item.json === 'string' ? item.json : JSON.stringify(item.json ?? {}, null, 2),
    jsonValid: true,
  }));
}
