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
import type { BranchItem, WorkspaceDetails, CommitChange, CommitResponse, MergeRequestRef } from '../types';
import { logger } from "../utils/logger";

export async function listBranches(params: { repositoryId: string }): Promise<BranchItem[]> {
  const qs = new URLSearchParams({
    repositoryId: params.repositoryId,
  });

  const result = await api<unknown>(`/api/workspaces?${qs.toString()}`);

  if (!Array.isArray(result)) {
    logger.error("listBranches expected array but got:", result);
    throw new TypeError("listBranches: API did not return an array");
  }

  return result as BranchItem[];
}

export async function getWorkspaceDetails(params: { repositoryId: string; branch: string; packageName: string; version: string; }): Promise<WorkspaceDetails> {
  const qs = new URLSearchParams({
    repositoryId: params.repositoryId,
    branch: params.branch,
    packageName: params.packageName,
    version: params.version,
  });
  return api<WorkspaceDetails>(`/api/workspaces/details?${qs.toString()}`);
}

export async function commitWorkspace(body: {
  repositoryId: string;
  branch: string;
  packageName: string;
  version: string;
  message: string;
  changes: CommitChange[];
  createMergeRequest?: boolean;
}): Promise<CommitResponse> {
  return api<CommitResponse>('/api/workspaces/commit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function commitWorkspaceReview(body: {
  repositoryId: string;
  branch: string;
  title: string;
}): Promise<MergeRequestRef> {
  return api<MergeRequestRef>('/api/workspaces/review', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function commitFile(body: {
  action: 'create' | 'update';
  repositoryId: string;
  branch: string;
  packageName: string;
  version: string;
  file: File;
  fileName: string;
  message?: string;
  createMergeRequest?: boolean;
}): Promise<CommitResponse> {
  const formData = new FormData();
  formData.append('repositoryId', body.repositoryId);
  formData.append('branch', body.branch);
  formData.append('packageName', body.packageName);
  formData.append('version', body.version);
  formData.append('file', body.file);
  formData.append('fileName', body.fileName);
  formData.append('action', body.action);

  if (body.message) {
    formData.append('message', body.message);
  }

  if (body.createMergeRequest !== undefined) {
    formData.append('createMergeRequest', String(body.createMergeRequest));
  }

  return api<CommitResponse>('/api/workspaces/commitFile', {
    method: 'POST',
    body: formData,
  });
}



export async function approveAndMergeReview(params: { projectId: string; mrId: string }): Promise<string> {
  const qs = new URLSearchParams({
    projectId: params.projectId,
    mrId: params.mrId
  });

  return api<string>(`/api/reviews/approve?${qs.toString()}`, {
    method: 'POST',
    responseType: "text"
  });
}
