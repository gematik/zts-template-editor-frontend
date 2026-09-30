
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

import type { ChangelogFile, MarkdownContent, MetadataFile, PackageModel } from '../types';

export const createDefaultPackageJson = (packageName: string, version: string): PackageModel => ({
  packagename: packageName,
  version: version,
  title: '',
  description: '',
  author: '',
  dependencies: '',
  altTitle: '',
  keywords: [],
  copyright: '',
});

export const createDefaultMetaJson = (packageName: string, version: string): MetadataFile => ({
  'package-name': packageName,
  'package-version': version,
  status: 'active',
  'publish-to-hl7': false,
  'additional-keywords': '',
  protected: false
});

export const createDefaultChangelogsJson = (packageName: string, version: string): ChangelogFile => ({
  'package-name': packageName,
  'package-version': version,
  changes: [{
            type: 'feature',
            description: `Initiale Version des FHIR-Packages für ${packageName} Version ${version}.`,
        }]
});

export const createDefaultMarkdown = (): MarkdownContent => ({
  external: '#### Weiterführende Informationen und externe Quellen',
  fhir: '#### Information zum FHIR-Package',
  author: '#### Information zum Autor',
  cycles: '#### Aktualisierungshinweise',
  generic: '#### Einleitung'
});
