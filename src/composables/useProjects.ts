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

import { ref, computed, type ComputedRef, type Ref } from 'vue';
import { fetchProjects, loadMrStatusForVersions } from '../services/projectService';
import { deleteVersionFromProjectBranch } from '../api/projects';
import type { ProjectItem, VersionItem, StatusMessageState, MergeRequestRef } from '../types';

import { fmtDate } from '../utils/utils'
import { useUserinfo } from './useUserinfo';
import { useAuth } from './useAuth';
import { badgeClass } from '../utils/badgeClass';
import { toErrorStatusMessage, toSuccessStatusMessage } from '../utils/apiErrorPresentation';

type HeaderStatus = 'Draft' | 'in Review' | 'Released Edit' | 'Final';
export type ProjectWithVersions = ProjectItem & { versions?: VersionItem[], expanded?: boolean };
export type ReviewNotificationItem = {
  key: string;
  projectId: number;
  packageName: string;
  version: string;
  branch: string;
  mergeRequest: MergeRequestRef;
  lastModified?: string;
  lastEditedAtMs: number;
  badges: { label: string; className: string; tooltip?: string }[];
};

type UseProjectsStore = {
  loading: Ref<boolean>;
  progress: Ref<number>;
  statusMessage: Ref<StatusMessageState>;
  projects: Ref<ProjectWithVersions[]>;
  lastUpdated: Ref<Date | null>;
  cache: Map<string, VersionItem[]>;
  reloadInterval?: number;
  progressResetTimeout?: number;
};

function createUseProjectsStore(): UseProjectsStore {
  return {
    loading: ref(false),
    progress: ref(0),
    statusMessage: ref<StatusMessageState>({
      type: null, title: null, message: null, debug: null,
    }),
    projects: ref<ProjectWithVersions[]>([]),
    lastUpdated: ref<Date | null>(null),
    cache: new Map<string, VersionItem[]>(),
    reloadInterval: undefined,
    progressResetTimeout: undefined,
  };
}

let store = createUseProjectsStore();

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const REVIEW_HISTORY_DISPLAY_DURATION_MS = 48 * 60 * 60 * 1000;

const getHeaderStatus = (versions?: VersionItem[]): HeaderStatus => {
  const sts = new Set(
    (versions ?? []).map(v => String((v as any).mrStatus ?? '').trim().toLowerCase())
  );

  if (sts.has('draft')) return 'Draft';
  if (sts.has('in review')) return 'in Review';
  if (sts.has('released edit')) return 'Released Edit';
  if (sts.has('final')) return 'Final';

  return 'Draft';
};

function badgesForStatus(status: string) {
  if (String(status).toLowerCase() === 'released edit') {
    return [
      {
        label: 'in Review',
        className: badgeClass('in Review'),
        tooltip: 'Diese Version ist bereits veröffentlicht und hat aktuell Änderungen im Review.',
      },
    ];
  }

  return [{ label: status, className: badgeClass(status) }];
}

function isNotifiableReviewStatus(status?: string): boolean {
  const normalized = String(status ?? '').toLowerCase();
  return normalized === 'released edit' || normalized === 'in review' || normalized === 'review';
}

export function parseProjectTimestamp(value?: string): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function buildReviewNotifications(projectItems: ProjectWithVersions[]): ReviewNotificationItem[] {
  const latestByKey = new Map<string, ReviewNotificationItem>();

  for (const project of projectItems) {
    for (const versionItem of project.versions ?? []) {
      if (!isNotifiableReviewStatus(versionItem.mrStatus)) continue;
      if (!versionItem.branch || !versionItem.mergeRequest?.id) continue;

      const key = `${project.projectId}@@${versionItem.mergeRequest.id}`;
      const lastModified = versionItem.lastModified ?? project.lastModified ?? '';
      const candidate: ReviewNotificationItem = {
        key,
        projectId: project.projectId,
        packageName: project.title,
        version: versionItem.version,
        branch: versionItem.branch,
        mergeRequest: versionItem.mergeRequest,
        lastModified,
        lastEditedAtMs: parseProjectTimestamp(lastModified),
        badges: badgesForStatus(String(versionItem.mrStatus ?? '')),
      };

      const existing = latestByKey.get(key);
      if (!existing || candidate.lastEditedAtMs > existing.lastEditedAtMs) {
        latestByKey.set(key, candidate);
      }
    }
  }

  return Array.from(latestByKey.values()).sort((a, b) => {
    if (b.lastEditedAtMs !== a.lastEditedAtMs) {
      return b.lastEditedAtMs - a.lastEditedAtMs;
    }

    return a.key.localeCompare(b.key);
  });
}

export function isReviewNotificationShownByDefault(item: ReviewNotificationItem): boolean {
  if (!item.lastEditedAtMs) return false;
  return item.lastEditedAtMs >= Date.now() - REVIEW_HISTORY_DISPLAY_DURATION_MS;
}
export function useProjects() {
  const { isReviewer } = useUserinfo();
  const { isLoggedIn, router } = useAuth();
  const canEdit = computed(() => !isReviewer.value);

  const onAddNewVersion = (projectId: string, packageName: string) => {
    router.push({
      name: 'newVersion',
      params: {
        projectId,
        packageName,
      },
    });
  };

  async function deleteVersion(projectId: number, version: string, workspace: string) {
    store.statusMessage.value = { type: null, title: null, message: null, debug: null };
    try {
      await deleteVersionFromProjectBranch(projectId, version, workspace);
      const project = store.projects.value.find(p => p.projectId === projectId);

      const shouldRemoveVersionEntry = (v: VersionItem) => {
        if (v.version !== version) return false;
        const vBranch = (v.branch ?? '').trim();
        const targetBranch = (workspace ?? '').trim();

        if (!targetBranch) return !vBranch;
        if (!vBranch) return true;
        return vBranch === targetBranch;
      };

      if (project?.versions) {
        project.versions = project.versions.filter(v => !shouldRemoveVersionEntry(v));
        project.mrStatus = getHeaderStatus(project.versions);
      }

      const cached = store.cache.get(String(projectId));
      if (cached) {
        const updatedCache = cached.filter(v => !shouldRemoveVersionEntry(v));
        if (updatedCache.length === 0) {
          store.cache.delete(String(projectId));
        } else {
          store.cache.set(String(projectId), updatedCache);
        }
      }

      store.statusMessage.value = toSuccessStatusMessage(`Version ${version} wurde erfolgreich gelöscht.`);
    } catch (e: any) {
      store.statusMessage.value = toErrorStatusMessage(e, `Die Version ${version} konnte nicht gelöscht werden.`);
    }
  }

  async function loadProjects() {
    if (store.loading.value) return;
    if (!isLoggedIn.value) return;
    store.loading.value = true;
    store.progress.value = 5;
    try {
      const progressInterval = setInterval(() => {
        if (store.progress.value < 30) store.progress.value += 1;
      }, 100);

      const loadedProjects = await fetchProjects();
      clearInterval(progressInterval);
      store.projects.value = loadedProjects.map(p => {
        const existingProject = store.projects.value.find(existing => existing.projectId === p.projectId);
        return { ...p, expanded: existingProject?.expanded ?? false };
      });
      store.lastUpdated.value = new Date();
      store.progress.value = 30;

      const total = store.projects.value.length;
      let done = 0;
      const maxParallel = 3;

      for (let i = 0; i < total; i += maxParallel) {
        const chunk = store.projects.value.slice(i, i + maxParallel);
        await Promise.allSettled(
          chunk.map(async project => {
            const cacheKey = String(project.projectId);
            const cachedVersions = store.cache.get(cacheKey);
            const hasCachedVersions = !!cachedVersions;

            if (cachedVersions) {
              project.versions = cachedVersions;
              project.mrStatus = getHeaderStatus(cachedVersions);
            }

            try {
              const versions = await loadMrStatusForVersions(project);
              store.cache.set(cacheKey, versions ?? []);
              project.versions = versions;
              project.mrStatus = getHeaderStatus(versions);
            } catch (err) {
              if (hasCachedVersions) {
                console.warn(`Fehler beim Aktualisieren von ${project.title}; verwende Cache`, err);
              } else {
                console.error(`Fehler beim Laden von ${project.title}`, err);
                project.mrStatus = 'Error';
              }
            }
            done++;
            store.progress.value = total > 0 ? 30 + Math.round((done / total) * 70) : 100;
          })
        );
      }
    } catch (e: any) {
      store.statusMessage.value = toErrorStatusMessage(e, 'Die Projekte konnten nicht geladen werden.');
    } finally {
      store.loading.value = false;
      store.progress.value = 100;
      if (store.progressResetTimeout) {
        clearTimeout(store.progressResetTimeout);
      }
      store.progressResetTimeout = globalThis.setTimeout(() => {
        store.progress.value = 0;
        store.progressResetTimeout = undefined;
      }, 500);
    }
  }

  async function toggleVersions(project: ProjectWithVersions) {
    project.expanded = !project.expanded;

    if (project.expanded && !project.versions && isLoggedIn.value) {
      const cached = store.cache.get(String(project.projectId));
      if (cached) {
        project.versions = cached;
      } else {
        const enriched = await loadMrStatusForVersions(project);
        store.cache.set(String(project.projectId), enriched);
        project.versions = enriched;
      }
    }
  }

  function startAutoRefresh() {
    if (!isLoggedIn.value) return;

    void loadProjects();

    if (!store.reloadInterval) {
      store.reloadInterval = globalThis.setInterval(() => {
        void loadProjects();
      }, DEFAULT_POLL_INTERVAL_MS);
    }
  }

  function stopAutoRefresh() {
    if (store.reloadInterval) {
      clearInterval(store.reloadInterval);
      store.reloadInterval = undefined;
    }
  }

  function clearProjects() {
    store.projects.value = [];
    store.cache.clear();
    store.lastUpdated.value = null;
  }

  return {
    loading: store.loading,
    progress: store.progress,
    statusMessage: store.statusMessage,
    projects: store.projects,
    lastUpdated: store.lastUpdated,
    isLoggedIn,
    fmtDate,
    badgeClass,
    loadProjects,
    startAutoRefresh,
    stopAutoRefresh,
    clearProjects,
    toggleVersions,
    onAddNewVersion,
    deleteVersion,
    cache: store.cache,
    canEdit,
    reviewNotifications: computed(() => buildReviewNotifications(store.projects.value)) as ComputedRef<ReviewNotificationItem[]>,
    isReviewNotificationShownByDefault,
  };
}
