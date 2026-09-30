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

// --- Package.template.json ---
import type { PackageModel, ResourceTemplateModel } from '../types';

export const RX_PACKAGE = /^[a-z0-9]+(?:\.[a-z0-9]+)+$/;
export const RX_SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
export const RX_DEP = /^[a-z0-9.]+#\d+\.\d+\.\d+(?:;[a-z0-9.]+#\d+\.\d+\.\d+)*$/i;
export const RX_KEYWORD = /^[\p{L}0-9 _.-]{1,30}$/u;


// --- TEMPLATE_MARKDOWN file names ---
// Mirrors backend FileNameValidation.templateMarkdownFileNamePattern.
export const RX_TEMPLATE_MARKDOWN_FILE_NAME = /^(?!\/)(?!.*\\)(?!.*(^|\/)\.\.($|\/))[A-Za-z0-9._\-/;:]+$/;

// Version is the first part of `${version};${canonicalUrl}`.
// Keep it stricter than the full file name so it cannot inject path, separator, or other backend-breaking characters.
export const RX_TEMPLATE_MARKDOWN_VERSION = /^[A-Za-z0-9._]+$/;

export function validateTemplateMarkdownFileName(version: string | undefined, canonicalUrl: string | undefined): string | null {
  const v = (version ?? '').trim();
  const c = (canonicalUrl ?? '').trim();

  if (!v) return 'Pflichtfeld';
  if (!RX_TEMPLATE_MARKDOWN_VERSION.test(v)) {
    return 'Erlaubt sind nur Buchstaben, Zahlen, Punkt und Unterstrich.';
  }

  // Do not report a file-name error while the canonical URL is still empty.
  // The entry is ignored on save until canonicalUrl and markdown content are present.
  if (!c) return null;

  const fileName = `${v};${c}`;
  if (!RX_TEMPLATE_MARKDOWN_FILE_NAME.test(fileName)) {
    return 'Version und Canonical URL ergeben keinen gültigen Dateinamen.';
  }

  return null;
}


export function validatePackageTemplate(m: PackageModel) {
  const errors: Record<string, string | null> = {};

  const requireText = (value: string | undefined, field: string) => {
    if (!value) errors[field] = 'Pflichtfeld';
  };
  const checkRegex = (value: string | undefined, field: string, rx: RegExp, msg: string) => {
    if (value && !rx.test(value)) errors[field] = msg;
  };
  const checkMax = (value: string | undefined, field: string, max: number, msg: string) => {
    if (value && value.length > max) errors[field] = msg;
  };

  requireText(m.packagename, 'packagename');
  checkRegex(m.packagename, 'packagename', RX_PACKAGE, 'Ungültiges Format (a.b.c)');

  requireText(m.version, 'version');
  checkRegex(m.version, 'version', RX_SEMVER, 'Ungültiges SemVer');

  requireText(m.title, 'title');
  checkMax(m.title, 'title', 255, 'Max 255 Zeichen');

  requireText(m.description, 'description');
  checkMax(m.description, 'description', 2000, 'Max 2000 Zeichen');

  requireText(m.author, 'author');
  checkMax(m.author, 'author', 255, 'Max 255 Zeichen');

  if (m.dependencies) {
    if (m.dependencies.length > 4096) errors.dependencies = 'Format: name#x.y.z(;...)';
    else checkRegex(m.dependencies, 'dependencies', RX_DEP, 'Format: name#x.y.z(;...)');
  }

  requireText(m.altTitle, 'altTitle');
  checkMax(m.altTitle, 'altTitle', 100, 'Max 100 Zeichen');

  if (!m.keywords?.length) {
    errors.keywords = 'Mind. 1 Keyword';
  } else if (m.keywords.some(k => !RX_KEYWORD.test(k))) {
    errors.keywords = 'Keyword-Format ungültig';
  }

  checkMax(m.copyright, 'copyright', 255, 'Max 255 Zeichen');

  return errors;
}

// --- FHIR Resource Template.json ---

export const RX_SEMVER2 = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
export const RX_FHIR_DATE = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/;
export const RX_FHIR_URI = /^\S*$/;
export const RX_FHIR_CODE = /^[^\s]+( [^\s]+)*$/;
export const RX_FHIR_ID = /^[A-Za-z0-9-.]{1,64}$/;

function normalizeOptionalString(value: string | undefined): string {
  return String(value ?? '').trim();
}

function hasValue(value: string | undefined): boolean {
  return normalizeOptionalString(value) !== '';
}

export function validateResourceTemplate(m: ResourceTemplateModel) {
  const errors: Record<string, string | null> = {};

  const checkRegex = (value: string | undefined, field: string, rx: RegExp, msg: string) => {
    const normalized = normalizeOptionalString(value);
    if (normalized && !rx.test(normalized)) errors[field] = msg;
  };

  const checkMax = (value: string | undefined, field: string, max: number, msg: string) => {
    const normalized = normalizeOptionalString(value);
    if (normalized && normalized.length > max) errors[field] = msg;
  };

  const requireField = (value: string | undefined, field: string) => {
    if (!hasValue(value)) errors[field] = 'Pflichtfeld';
  };

  checkRegex(m.version, 'version', RX_SEMVER2, 'Ungültiges SemVer');

  checkRegex(m.effectivePeriod?.start, 'effectivePeriod.start', RX_FHIR_DATE, 'Ungültiges Datum');
  checkRegex(m.effectivePeriod?.end, 'effectivePeriod.end', RX_FHIR_DATE, 'Ungültiges Datum');

  requireField(m.url, 'url');
  if (hasValue(m.url)) {
    checkMax(m.url, 'url', 2048, 'Max 2048 Zeichen');
    if (!errors.url) checkRegex(m.url, 'url', RX_FHIR_URI, 'Ungültige URI');
  }

  requireField(m.resourceType, 'resourceType');

  checkMax(m.title, 'title', 255, 'Max 255 Zeichen');
  checkMax(m.publisher, 'publisher', 255, 'Max 255 Zeichen');
  checkRegex(m.name, 'name', RX_FHIR_ID, 'Ungültig (1–64, A-Z a-z 0-9 - .)');
  checkRegex(m.language, 'language', RX_FHIR_CODE, 'FHIR code erwartet');

  for (const [index, identifier] of (m.identifier ?? []).entries()) {
    checkRegex(identifier.system, `identifier.${index}.system`, RX_FHIR_URI, 'FHIR uri erwartet');
    checkRegex(identifier.value, `identifier.${index}.value`, /^\S*$/, 'FHIR string ohne Whitespaces erwartet');
  }

  checkMax(m.description, 'description', 2000, 'Max 2000 Zeichen');
  checkRegex(m.date, 'date', RX_FHIR_DATE, 'Ungültiges Datum');

  for (const [index, contact] of (m.contact ?? []).entries()) {
    checkMax(contact.name, `contact.${index}.name`, 255, 'Max 255 Zeichen');
  }

  return errors;
}
