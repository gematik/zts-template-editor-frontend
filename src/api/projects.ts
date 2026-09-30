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

import { api } from './http';
import type { ProjectItem, VersionItem } from '../types';

export async function listProjects(): Promise<ProjectItem[]> {
  return api<ProjectItem[]>('/api/projects');
}

export async function listVersions(projectId: number, workspace: string): Promise<VersionItem[]> {
  let url = `/api/projects/${projectId}/versions`;
  if (workspace) {
    url += `?${new URLSearchParams({ workspace }).toString()}`;
  }
  const raw = await api<VersionItem[]>(url);
  return raw.map(v => ({
    version: v.version,
    lastModified: v.lastModified,
  }));
}

export async function deleteVersionFromProjectBranch(projectId: number, version: string, workspace: string): Promise<void> {
  return api<void>(
    `/api/projects/${projectId}/versions/${version}?${new URLSearchParams({ workspace }).toString()}`,
    { method: 'DELETE' }
  );
}