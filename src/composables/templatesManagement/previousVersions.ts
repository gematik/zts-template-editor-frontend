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

import semver from 'semver';
import { validatePackageTemplate } from '../../validation/rules';
import type { VersionItem } from '../../types';
import type { LoadedPackageData } from './mappers';

/**
 * Analyzes a previously loaded package version for validation issues.
 *
 * Responsibilities:
 * - Runs validation rules on the package JSON
 * - Collects warnings for missing or invalid fields
 *
 * Used in "create from previous version" flows to inform the user.
 */
export function analyzePreviousPackageData(pkg: LoadedPackageData, version: string): { warnings: string[]; version: string } {
  const warnings: string[] = [];
  const errors = validatePackageTemplate(pkg.pkgJson);
  const errorFields = Object.keys(errors);

  if (errorFields.length) {
    warnings.push(
      `Package JSON: Ungültige oder fehlende Felder → ${errorFields
        .map((field) => `${field} (${errors[field]})`)
        .join(', ')}`
    );
  }

  return { warnings, version };
}

/**
 * Sorts versions in descending order using semantic versioning.
 *
 * Ensures that the newest versions appear first.
 */
export function sortVersionsDescending(versions: VersionItem[]): VersionItem[] {
  return [...(versions ?? [])].sort((a, b) => semver.rcompare(a.version, b.version));
}
