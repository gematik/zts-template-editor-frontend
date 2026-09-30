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

import { listProjects, listVersions } from '../api/projects'
import { listBranches } from '../api/workspaces'
import semver from 'semver';
import type { VersionItem, ProjectItem, BranchItem } from '../types';
import { logger } from '../utils/logger';

const projectServiceLogger = logger.scope('projectService');

export async function fetchProjects(): Promise<ProjectItem[]> {
    projectServiceLogger.debug('Project list is loading.');
    return await listProjects()
}

export async function fetchDefaultBranch(projectId: number): Promise<BranchItem | null> {
    projectServiceLogger.debug("The default branch is loading.", { projectId });
    const branches = await listBranches({ repositoryId: String(projectId) });
    const defaultBranch = branches.find(b => b.isDefaultBranch);
    return defaultBranch ?? null;
}

export async function fetchDefaultBranchVersions(projectId: number, branch: BranchItem): Promise<VersionItem[]> {
    let defaultBranch = branch;
    if (!defaultBranch.isDefaultBranch) {
        projectServiceLogger.warn(`No default branch found for project ${projectId}.`);
        return [];
    }
    const versions = await listVersions(projectId, defaultBranch.branch);
    return versions.map(v => ({ ...v, branch: defaultBranch.branch }));
}

export async function loadMrStatusForVersions(project: ProjectItem): Promise<VersionItem[]> {

    const repositoryId = String(project.projectId);
    const branches = await listBranches({ repositoryId });

    const defaultBranch = branches.find(b => b.isDefaultBranch && b.isProtected);

    if (!defaultBranch) {
        projectServiceLogger.warn(`No default branch found for project ${repositoryId}.`);
        return [];
    }

    const defaultVersions = await listVersions(project.projectId, defaultBranch.branch);
    const augmentedVersionsMap = new Map<string, VersionItem>();
    const itemKey = (version: string, branch: string) => `${version}@@${branch}`;
    const defaultVersionSet = new Set(defaultVersions.map(v => v.version));

    defaultVersions.forEach(v => {
        augmentedVersionsMap.set(itemKey(v.version, defaultBranch.branch), {
            ...v,
            mergeRequest: defaultBranch.mergeRequest || null,
            mrStatus: 'Final',
            branch: defaultBranch.branch
        } as VersionItem);
    });

    const featureBranches = branches.filter(b =>
        b.branch.startsWith('feature/') &&
        !b.isDefaultBranch &&
        !b.isProtected
    );

    for (const fBranch of featureBranches) {
        const versionMatch = fBranch.branch.match(/^feature\/(\d+\.\d+\.\d+)$/);
        const featureVersion = versionMatch ? versionMatch[1] : null;
        if (!featureVersion) continue;

        const isReleasedVersionEdit = defaultVersionSet.has(featureVersion);
        const mrObject = fBranch.mergeRequest ?? null;
        let mrStatus: 'Draft' | 'in Review' | 'Released Edit' = 'Draft';
        if (mrObject) {
            mrStatus = isReleasedVersionEdit ? 'Released Edit' : 'in Review';
        }

        augmentedVersionsMap.set(itemKey(featureVersion, fBranch.branch), {
            version: featureVersion,
            title: project.title,
            lastModified: fBranch.lastModified ?? '',
            mergeRequest: mrObject,
            mrStatus,
            branch: fBranch.branch
        } as VersionItem);
    }

    // Sorting priority for workflow statuses in overview lists.
    // Lower rank means higher visibility for review/action workflows.
    // Keep released edits and regular reviews in the same bucket.
    const statusRank = (status?: string): number => {
        switch (String(status ?? '').toLowerCase()) {
            case 'released edit':
            case 'in review': return 1;
            case 'draft': return 2;
            case 'final': return 3;
            default: return 4;
        }
    };

    // Prefer semantic version ordering; gracefully fall back for non-semver strings.
    const compareSemverDesc = (left?: string, right?: string): number => {
        const l = String(left ?? '').trim();
        const r = String(right ?? '').trim();

        const lv = semver.valid(l);
        const rv = semver.valid(r);
        if (lv && rv) return semver.rcompare(lv, rv);
        if (lv) return -1;
        if (rv) return 1;

        return r.localeCompare(l);
    };

    const isFeatureBranch = (branch?: string): boolean => {
        return String(branch ?? '').startsWith('feature/');
    };

    const isFinalStatus = (status?: string): boolean => {
        return String(status ?? '').trim().toLowerCase() === 'final';
    };

    return Array.from(augmentedVersionsMap.values()).sort((a, b) => {
        // 1) Group by workflow status first (released edits/reviews/drafts before finals).
        const statusDiff = statusRank(a.mrStatus) - statusRank(b.mrStatus);
        if (statusDiff !== 0) return statusDiff;

        // Only final versions are primarily sorted by version, as it doesn't really matter when the last edit was. But for non-finals we want to see the newest edits most prominently.
        if (isFinalStatus(a.mrStatus) && isFinalStatus(b.mrStatus)) {
            const finalVersionDiff = compareSemverDesc(a.version, b.version);
            if (finalVersionDiff !== 0) return finalVersionDiff;
        }

        // 2) Within the same non-final status, show newest edits first.
        const modifiedDiff = String(b.lastModified ?? '').localeCompare(String(a.lastModified ?? ''));
        if (modifiedDiff !== 0) return modifiedDiff;

        // 3) Deterministic fallback: prefer higher versions.
        const versionDiff = compareSemverDesc(a.version, b.version);
        if (versionDiff !== 0) return versionDiff;

        // 4) For identical version+date, show feature branches first (active work).
        const featureDiff = Number(isFeatureBranch(b.branch)) - Number(isFeatureBranch(a.branch));
        if (featureDiff !== 0) return featureDiff;

        // 5) Final stable fallback for predictable rendering order.
        return String(a.branch ?? '').localeCompare(String(b.branch ?? ''));
    });
}