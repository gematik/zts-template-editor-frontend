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

export function fmtDate(iso: string | Date | undefined): string {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return String(iso)
  }
}


const mdErr: Record<string, string | null> = {};

export function limitMd(key: string, v: string): string {
  if (v.length > 5000) {
    mdErr[key] = `Max 5000 Zeichen (${v.length})`;
    return v.slice(0, 5000);
  }
  mdErr[key] = null;
  return v;
}

export function compareSemverDesc(left?: string, right?: string): number {
  const l = String(left ?? '').trim();
  const r = String(right ?? '').trim();

  const lc = semver.coerce(l)?.version;
  const rc = semver.coerce(r)?.version;

  if (lc && rc) {
    const semverDiff = semver.rcompare(lc, rc);
    if (semverDiff !== 0) return semverDiff;
  }

  const numericDiff = r.localeCompare(l, undefined, { numeric: true, sensitivity: 'base' });
  if (numericDiff !== 0) return numericDiff;

  // Final tie-breaker for values
  return r.localeCompare(l);
}

