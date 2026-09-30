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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectItem, VersionItem } from '../../types';
import { api } from '../../api/http';
import { listVersions, listProjects, deleteVersionFromProjectBranch } from '../../api/projects';

vi.mock('../../api/http', () => {
  const mockApi = vi.fn();
  return {
    api: mockApi
  };
});

const mockApi = vi.mocked(api);


describe('Test: Projects API Funktionen', () => {
  beforeEach(() => {

    mockApi.mockClear();
  });

  // =========================================================================
  // TEST: listProjects
  // =========================================================================

  it('Test: listProjects sollte die API mit dem korrekten Endpunkt aufrufen', async () => {
    const mockProjects: ProjectItem[] = [
      { projectId: 1, description: 'pkg.abc.cdf', title: 'pkg.abc.cdf', lastModified: '2025-10-01' },
      { projectId: 2, description: 'pkg.bbc.cdf', title: 'pkg.bbc.cdf', lastModified: '2025-11-01' },
    ];


    mockApi.mockResolvedValue(mockProjects);

    const result = await listProjects();

    expect(mockApi).toHaveBeenCalledWith('/api/projects');
    expect(mockApi).toHaveBeenCalledTimes(1);

    expect(result).toEqual(mockProjects);
    expect(result.length).toBe(2);
  });

  it('listProjects sollte einen Fehler werfen, wenn der API-Aufruf fehlschlägt', async () => {
    const error = new Error('Netzwerkfehler');
    mockApi.mockRejectedValue(error);

    await expect(listProjects()).rejects.toThrow('Netzwerkfehler');
  });

  // =========================================================================
  // TEST: listVersions
  // =========================================================================


  const expectedVersions: VersionItem[] = [
    { version: '2025.0.0', lastModified: '2025-10-01' },
    { version: '2025.0.1', lastModified: '2025-10-15' },
  ];

  it('Test:listVersions sollte die korrekte URL ohne workspace-Parameter aufrufen und Daten mappen', async () => {
    mockApi.mockResolvedValue(expectedVersions);

    const projectId = 123;
    const branch = "dev";
    const result = await listVersions(projectId, branch);

    expect(mockApi).toHaveBeenCalledWith(`/api/projects/${projectId}/versions?workspace=dev`);
    expect(result).toEqual(expectedVersions);

  });

  it('Test: listVersions sollte die korrekte URL mit workspace-Parameter aufrufen', async () => {
    mockApi.mockResolvedValue(expectedVersions);

    const projectId = 456;
    const workspace = 'feature/2025.0.0';
    const result = await listVersions(projectId, workspace);

    const expectedUrl = `/api/projects/${projectId}/versions?workspace=feature%2F2025.0.0`;
    expect(mockApi).toHaveBeenCalledWith(expectedUrl);

    expect(result).toEqual(expectedVersions);
  });

  it('Test: listVersions sollte Fehler korrekt weitergeben', async () => {
    const error = new Error('Versions-API Fehler');
    mockApi.mockRejectedValue(error);

    await expect(listVersions(1, "dev")).rejects.toThrow('Versions-API Fehler');
  });

  // =========================================================================
  // TEST: deleteVersionFromProjectBranch
  // =========================================================================

  it('Test: deleteVersionFromProjectBranch sollte die korrekte URL und Methode (DELETE) verwenden', async () => {
    mockApi.mockResolvedValue(undefined);

    const projectId = 789;
    const version = '2025.0.2';
    const workspace = 'dev';

    await deleteVersionFromProjectBranch(projectId, version, workspace);

    expect(mockApi).toHaveBeenCalledWith(
      `/api/projects/${projectId}/versions/${version}?workspace=dev`,
      { method: 'DELETE' }
    );
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('Test: deleteVersionFromProjectBranch sollte workspace korrekt URL-encoden', async () => {
    mockApi.mockResolvedValue(undefined);

    const projectId = 999;
    const version = '2025.0.3';
    const workspace = 'feature/2025.0.0';

    await deleteVersionFromProjectBranch(projectId, version, workspace);

    expect(mockApi).toHaveBeenCalledWith(
      `/api/projects/${projectId}/versions/${version}?workspace=${encodeURIComponent(workspace)}`,
      { method: 'DELETE' }
    );
  });

  it('Test: deleteVersionFromProjectBranch sollte Fehler korrekt weitergeben', async () => {
    const error = new Error('Delete-API Fehler');
    mockApi.mockRejectedValue(error);

    await expect(deleteVersionFromProjectBranch(1, '2025.0.0', 'dev')).rejects.toThrow('Delete-API Fehler');
  });

});