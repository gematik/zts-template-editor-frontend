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

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectItem, VersionItem } from '../../types';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

const {
  mockPush,
  mockFetchProjects,
  mockLoadMrStatus,
  mockDeleteVersion,
  authState,
  userState,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockFetchProjects: vi.fn(),
  mockLoadMrStatus: vi.fn(),
  mockDeleteVersion: vi.fn(),
  authState: { loggedIn: true },
  userState: { isReviewer: false },
}));

vi.mock('../../composables/useUserinfo', async () => {
  const { reactive, computed } = await vi.importActual<typeof import('vue')>('vue');
  const state = reactive(userState);

  return {
    useUserinfo: () => ({
      isReviewer: computed(() => state.isReviewer),
    }),
  };
});

vi.mock('../../composables/useAuth', async () => {
  const { reactive, computed } = await vi.importActual<typeof import('vue')>('vue');
  const state = reactive(authState);

  return {
    useAuth: () => ({
      isLoggedIn: computed(() => state.loggedIn),
      router: { push: mockPush },
    }),
  };
});

vi.mock('../../services/projectService', () => ({
  fetchProjects: mockFetchProjects,
  loadMrStatusForVersions: mockLoadMrStatus,
}));

vi.mock('../../api/projects', () => ({
  deleteVersionFromProjectBranch: mockDeleteVersion,
}));

vi.mock('../../utils/utils', () => ({ fmtDate: vi.fn((date) => `formatted-${date}`) }));

type UseProjectsModule = typeof import('../../composables/useProjects');

async function loadUseProjectsModule(): Promise<UseProjectsModule> {
  vi.resetModules();
  return await import('../../composables/useProjects');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  authState.loggedIn = true;
  userState.isReviewer = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

const mockProject: ProjectItem = {
  projectId: 1,
  description: 'Ein Testprojekt für FHIR-Pakete',
  title: 'test.package.de',
  lastModified: '2024-01-01T00:00:00Z',
  mrStatus: 'Draft',
};

const mockVersion: VersionItem = {
  version: '1.0.0',
  lastModified: '2024-01-15',
  mrStatus: 'Final',
};

async function flushAsyncState() {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
}

describe('Test Composable useProjects', () => {
  it('Test: berechnet isLoggedIn - angemeldet', async () => {
    const { useProjects } = await loadUseProjectsModule();
      authState.loggedIn = true;

    const { isLoggedIn } = useProjects();
    expect(isLoggedIn.value).toBe(true);
  });

  it('Test: berechnet isLoggedIn - angemeldet nicht', async () => {
    const { useProjects } = await loadUseProjectsModule();
    authState.loggedIn = false;

    const { isLoggedIn } = useProjects();
    expect(isLoggedIn.value).toBe(false);
  });

  it('Test: navigiert korrekt in onAddNewVersion', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const { onAddNewVersion } = useProjects();

    onAddNewVersion('2', 'new.package');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'newVersion',
      params: { projectId: '2', packageName: 'new.package' },
    });
  });

  it('Test: loadProjects lädt Projekte und setzt loading', async () => {
    const { useProjects } = await loadUseProjectsModule();
    mockFetchProjects.mockResolvedValue([mockProject]);
    mockLoadMrStatus.mockResolvedValue([]);

    const { loadProjects, loading, projects } = useProjects();
    const promise = loadProjects();
    expect(loading.value).toBe(true);

    await promise;

    expect(mockFetchProjects).toHaveBeenCalled();
    expect(loading.value).toBe(false);
    expect(projects.value.length).toBe(1);
    expect(projects.value[0]?.expanded).toBe(false);

    await vi.advanceTimersByTimeAsync(500);
    expect(loading.value).toBe(false);
  });

  it.each([
    { statuses: [{ version: '1.0.0', mrStatus: 'Draft' }], expected: 'Draft' },
    { statuses: [{ version: '1.0.0', mrStatus: ' in Review ' }], expected: 'in Review' },
    { statuses: [{ version: '1.0.0', mrStatus: 'Released Edit' }], expected: 'Released Edit' },
    { statuses: [{ version: '1.0.0', mrStatus: 'Final' }], expected: 'Final' },
    { statuses: [], expected: 'Draft' },
  ])('Test: loadProjects setzt Header-Status korrekt auf $expected', async ({ statuses, expected }) => {
    const { useProjects } = await loadUseProjectsModule();
    mockFetchProjects.mockResolvedValue([{ ...mockProject, projectId: 21 }]);
    mockLoadMrStatus.mockResolvedValue(statuses as VersionItem[]);

    const { loadProjects, projects } = useProjects();
    await loadProjects();

    expect(projects.value[0]?.mrStatus).toBe(expected);
  });

  it('Test: loadProjects nutzt Cache bei Refresh-Fehler und setzt Warnung', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const cachedVersions = [{ version: '2.0.0', mrStatus: 'in Review', branch: 'feature/2.0.0' } as VersionItem];
    mockFetchProjects.mockResolvedValue([{ ...mockProject, projectId: 99, title: 'cached.project' }]);
    mockLoadMrStatus.mockRejectedValue(new Error('refresh failed'));

    const { loadProjects, projects, cache } = useProjects();
    cache.set('99', cachedVersions);

    await loadProjects();

    expect(projects.value[0]?.versions).toEqual(cachedVersions);
    expect(projects.value[0]?.mrStatus).toBe('in Review');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('Test: loadProjects setzt Error-Status bei Ladefehler ohne Cache', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mockFetchProjects.mockResolvedValue([{ ...mockProject, projectId: 100, title: 'uncached.project' }]);
    mockLoadMrStatus.mockRejectedValue(new Error('load failed'));

    const { loadProjects, projects } = useProjects();
    await loadProjects();

    expect(projects.value[0]?.mrStatus).toBe('Error');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('Test: loadProjects setzt Fehlerzustand bei Exception', async () => {
    const { useProjects } = await loadUseProjectsModule();
    mockFetchProjects.mockRejectedValue(new Error('API-Fehler'));

    const { loadProjects, statusMessage, loading, progress } = useProjects();
    await loadProjects();

    expect(statusMessage.value.message).toBe('API-Fehler');
    expect(loading.value).toBe(false);
    expect(progress.value).toBe(100);
    await vi.advanceTimersByTimeAsync(500);
    expect(progress.value).toBe(0);
  });

  it('Test: badgeClass liefert korrekte CSS-Klassen', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const { badgeClass } = useProjects();

    expect(badgeClass('Draft')).toBe('badge-draft');
    expect(badgeClass('Final')).toBe('badge-final');
    expect(badgeClass('in Review')).toBe('badge-reviewed');
    expect(badgeClass('deprecated')).toBe('badge-deprecated');
    expect(badgeClass(null as any)).toBe('badge-default');
  });

  it('Test: toggleVersions lädt Versionen wenn nicht gecached', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const { projects, toggleVersions } = useProjects();
    const project = { ...mockProject, expanded: false, versions: undefined as VersionItem[] | undefined };
    projects.value = [project];

    mockLoadMrStatus.mockResolvedValue([mockVersion]);

    await toggleVersions(project);
    expect(project.expanded).toBe(true);
    expect(mockLoadMrStatus).toHaveBeenCalledOnce();

    await toggleVersions(project);
    expect(project.expanded).toBe(false);
    expect(mockLoadMrStatus).toHaveBeenCalledOnce();
  });

  it('Test: toggleVersions nutzt gecachte Versionen ohne Reload', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const { projects, toggleVersions, cache } = useProjects();
    const project = { ...mockProject, expanded: false, versions: [mockVersion] };
    projects.value = [project];

    await toggleVersions(project);
    expect(project.expanded).toBe(true);

    const project2 = { ...mockProject, projectId: 2, expanded: false };
    cache.set('2', [mockVersion]);
    projects.value.push(project2 as any);

    await toggleVersions(project2 as any);
    expect(project2.expanded).toBe(true);
    expect(mockLoadMrStatus).not.toHaveBeenCalled();
  });

  it('Test: deleteVersion löscht erfolgreich, leert Cache und passt Header-Status an', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const projectId = 10;
    const { cache, projects, deleteVersion, statusMessage } = useProjects();

    cache.set(String(projectId), [
      { version: '1.2.3', branch: 'feature/1.2.3', mrStatus: 'in Review' } as VersionItem,
      { version: '1.2.4', branch: 'feature/1.2.4', mrStatus: 'Draft' } as VersionItem,
    ]);
    projects.value = [{
      projectId,
      description: 'x',
      title: 'pkg',
      lastModified: '2024-01-01T00:00:00Z',
      versions: [
        { version: '1.2.3', branch: 'feature/1.2.3', mrStatus: 'in Review' } as VersionItem,
        { version: '1.2.4', branch: 'feature/1.2.4', mrStatus: 'Draft' } as VersionItem,
      ],
      mrStatus: 'in Review',
    } as any];
    mockDeleteVersion.mockResolvedValue(undefined);

    await deleteVersion(projectId, '1.2.3', 'feature/1.2.3');

    expect(mockDeleteVersion).toHaveBeenCalledWith(projectId, '1.2.3', 'feature/1.2.3');
    expect(statusMessage.value.type).toBe('success');
    expect(projects.value[0]!.versions).toHaveLength(1);
    expect(projects.value[0]!.versions![0]!.version).toBe('1.2.4');
    expect(projects.value[0]!.mrStatus).toBe('Draft');
    expect(cache.get(String(projectId))!).toHaveLength(1);
  });

  it('Test: deleteVersion setzt Fehlerstatus bei Exception', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const { deleteVersion, statusMessage } = useProjects();

    mockDeleteVersion.mockRejectedValueOnce(new Error('Delete-Error'));

    await deleteVersion(99, '0.0.1', 'dev');

    expect(mockDeleteVersion).toHaveBeenCalledWith(99, '0.0.1', 'dev');
    expect(statusMessage.value.type).toBe('error');
    expect(statusMessage.value.message).toBe('Delete-Error');
    expect(mockFetchProjects).not.toHaveBeenCalled();
  });

  it('Test: deleteVersion löscht nur passenden Branch bei gleicher Version mehrfach', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const projectId = 200;
    const { projects, cache, deleteVersion } = useProjects();

    projects.value = [{
      projectId,
      description: 'x',
      title: 'pkg',
      lastModified: '2024-01-01T00:00:00Z',
      versions: [
        { version: '3.1.0', branch: 'main', mrStatus: 'Released Edit', lastModified: 'keep' } as VersionItem,
        { version: '3.1.0', branch: 'feature/3.1.0', mrStatus: 'Draft', lastModified: 'drop' } as VersionItem,
      ],
      mrStatus: 'Draft',
    } as any];
    cache.set(String(projectId), [
      { version: '3.1.0', branch: 'main', mrStatus: 'Released Edit', lastModified: 'keep' } as VersionItem,
      { version: '3.1.0', branch: 'feature/3.1.0', mrStatus: 'Draft', lastModified: 'drop' } as VersionItem,
    ]);

    mockDeleteVersion.mockResolvedValue(undefined);

    await deleteVersion(projectId, '3.1.0', 'feature/3.1.0');

    expect(projects.value[0]!.versions).toHaveLength(1);
    expect(projects.value[0]!.versions![0]!.lastModified).toBe('keep');
    expect(projects.value[0]!.mrStatus).toBe('Released Edit');
    expect(cache.get(String(projectId))![0]!.lastModified).toBe('keep');
  });

  it('Test: deleteVersion mit leerem Workspace löscht nur branchlose Versionen', async () => {
    const { useProjects } = await loadUseProjectsModule();
    const projectId = 201;
    const { projects, cache, deleteVersion } = useProjects();

    projects.value = [{
      projectId,
      description: 'x',
      title: 'pkg',
      lastModified: '2024-01-01T00:00:00Z',
      versions: [
        { version: '4.0.0', branch: 'main', mrStatus: 'Released Edit', lastModified: 'keep-main' } as VersionItem,
        { version: '4.0.0', branch: 'feature/4.0.0', mrStatus: 'Draft', lastModified: 'keep-feature' } as VersionItem,
        { version: '4.0.0', mrStatus: 'Draft', lastModified: 'legacy-no-branch' } as VersionItem,
      ],
      mrStatus: 'Draft',
    } as any];
    cache.set(String(projectId), [
      { version: '4.0.0', branch: 'main', mrStatus: 'Released Edit', lastModified: 'keep-main' } as VersionItem,
      { version: '4.0.0', branch: 'feature/4.0.0', mrStatus: 'Draft', lastModified: 'keep-feature' } as VersionItem,
      { version: '4.0.0', mrStatus: 'Draft', lastModified: 'legacy-no-branch' } as VersionItem,
    ]);

    mockDeleteVersion.mockResolvedValue(undefined);

    await deleteVersion(projectId, '4.0.0', '' as any);

    expect(projects.value[0]!.versions!.map(v => v.lastModified)).toEqual(['keep-main', 'keep-feature']);
    expect(cache.get(String(projectId))!.map(v => v.lastModified)).toEqual(['keep-main', 'keep-feature']);
  });
});

describe('Hilfsfunktionen und Review Notifications', () => {
  it('Test: parseProjectTimestamp liefert 0 für ungültige Werte', async () => {
    const { parseProjectTimestamp } = await loadUseProjectsModule();

    expect(parseProjectTimestamp()).toBe(0);
    expect(parseProjectTimestamp('kaputt')).toBe(0);
    expect(parseProjectTimestamp('2024-01-01T00:00:00Z')).toBeGreaterThan(0);
  });

  it('Test: buildReviewNotifications dedupliziert Merge Requests und sortiert nach letztem Edit', async () => {
    const { buildReviewNotifications } = await loadUseProjectsModule();

    const notifications = buildReviewNotifications([
      {
        projectId: 1,
        description: 'x',
        title: 'pkg',
        lastModified: '2024-01-01T00:00:00Z',
        versions: [
          {
            version: '1.0.0',
            mrStatus: 'Released Edit',
            branch: 'feature/a',
            mergeRequest: { id: 10 },
            lastModified: '2024-01-02T00:00:00Z',
          },
          {
            version: '1.0.1',
            mrStatus: 'in Review',
            branch: 'feature/a-newer',
            mergeRequest: { id: 10 },
            lastModified: '2024-01-03T00:00:00Z',
          },
          {
            version: '2.0.0',
            mrStatus: 'in Review',
            branch: 'feature/b',
            mergeRequest: { id: 11 },
            lastModified: '2024-01-04T00:00:00Z',
          },
          {
            version: '3.0.0',
            mrStatus: 'Draft',
            branch: 'feature/c',
            mergeRequest: { id: 12 },
            lastModified: '2024-01-05T00:00:00Z',
          },
        ],
      } as any,
    ]);

    expect(notifications).toHaveLength(2);
    expect(notifications[0]?.mergeRequest.id).toBe(11);
    expect(notifications[1]?.mergeRequest.id).toBe(10);
    expect(notifications[1]?.version).toBe('1.0.1');
  });

  it('Test: isReviewNotificationShownByDefault zeigt nur frische Einträge', async () => {
    const { isReviewNotificationShownByDefault } = await loadUseProjectsModule();
    vi.setSystemTime(new Date('2024-01-10T12:00:00Z'));

    expect(isReviewNotificationShownByDefault({ lastEditedAtMs: Date.parse('2024-01-09T12:00:00Z') } as any)).toBe(true);
    expect(isReviewNotificationShownByDefault({ lastEditedAtMs: Date.parse('2024-01-01T11:59:59Z') } as any)).toBe(false);
    expect(isReviewNotificationShownByDefault({ lastEditedAtMs: 0 } as any)).toBe(false);
  });

  it('Test: canEdit ist für Reviewer false', async () => {
    const { useProjects } = await loadUseProjectsModule();
    userState.isReviewer = true;

    const { canEdit } = useProjects();
    expect(canEdit.value).toBe(false);
  });
});

describe('Watcher und Polling', () => {
  it('Test: startAutoRefresh startet Polling und stopAutoRefresh räumt auf', async () => {
    const { useProjects } = await loadUseProjectsModule();
    mockFetchProjects.mockResolvedValue([mockProject]);
    mockLoadMrStatus.mockResolvedValue([]);

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const Wrapper = defineComponent({
      setup() {
        const projectsApi = useProjects();
        projectsApi.startAutoRefresh();
        return projectsApi;
      },
      template: '<div></div>',
    });

    const wrapper = mount(Wrapper);
    await flushAsyncState();

    expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalled();

    wrapper.vm.stopAutoRefresh();
    await flushAsyncState();

    expect(clearIntervalSpy).toHaveBeenCalled();

    wrapper.unmount();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('Test: Polling ruft loadProjects periodisch auf', async () => {
    const { useProjects } = await loadUseProjectsModule();
    mockFetchProjects.mockResolvedValue([mockProject]);
    mockLoadMrStatus.mockResolvedValue([]);

    const Wrapper = defineComponent({
      setup() {
        const projectsApi = useProjects();
        projectsApi.startAutoRefresh();
        return projectsApi;
      },
      template: '<div></div>',
    });

    const wrapper = mount(Wrapper);
    await flushAsyncState();
    expect(mockFetchProjects).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(mockFetchProjects).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });
});
