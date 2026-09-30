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
import type { WorkspaceDetails, BranchItem, CommitChange } from '../../types';
import { getWorkspaceDetails, listBranches, commitWorkspace, commitWorkspaceReview, approveAndMergeReview, commitFile } from '../../api/workspaces';
import { api } from '../../api/http';

vi.mock('../../api/http', () => {
    const mockApi = vi.fn();
    return {
        api: mockApi
    };
});

const mockApi = vi.mocked(api);

async function formDataToObject(fd: FormData): Promise<Record<string, any>> {
    const obj: Record<string, any> = {};
    for (const [key, value] of fd.entries()) {
        // Mehrfachwerte (bei gleicher key) abbilden
        if (obj[key] !== undefined) {
            obj[key] = Array.isArray(obj[key]) ? [...obj[key], value] : [obj[key], value];
        } else {
            obj[key] = value;
        }
    }
    return obj;
}


describe('getWorkspaceDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test: ruft API mit korrekt konstruiertem Query-String auf', async () => {
        const params = {
            repositoryId: 'repo123',
            branch: 'feature-branch',
            packageName: 'pkg',
            version: '1.0.0'
        };
        const expectedUrl = '/api/workspaces/details?repositoryId=repo123&branch=feature-branch&packageName=pkg&version=1.0.0';
        const mockDetails: WorkspaceDetails = {} as any;
        mockApi.mockResolvedValue(mockDetails);

        const result = await getWorkspaceDetails(params);

        expect(mockApi).toHaveBeenCalledTimes(1);
        expect(mockApi).toHaveBeenCalledWith(expectedUrl);
        expect(result).toBe(mockDetails);
    });

    it('Test: kodiert Sonderzeichen in Query-Parametern', async () => {
        const params = {
            repositoryId: 'repo 123',
            branch: 'feat/branch',
            packageName: '@scope/pkg',
            version: '1.0.0-beta+meta'
        };
        const encoded = new URLSearchParams({
            repositoryId: params.repositoryId,
            branch: params.branch,
            packageName: params.packageName,
            version: params.version
        }).toString();
        const expectedUrl = `/api/workspaces/details?${encoded}`;
        mockApi.mockResolvedValue({} as WorkspaceDetails);

        await getWorkspaceDetails(params);

        expect(mockApi).toHaveBeenCalledWith(expectedUrl);
        expect(expectedUrl).toContain('repo+123');
        expect(expectedUrl).toContain('feat%2Fbranch');
        expect(expectedUrl).toContain('%40scope%2Fpkg');
        expect(expectedUrl).toContain('1.0.0-beta%2Bmeta');
    });

    it('Test: propagiert Fehler der API', async () => {
        const params = {
            repositoryId: 'r',
            branch: 'b',
            packageName: 'p',
            version: 'v'
        };
        const error = new Error('Network');
        (mockApi as any).mockImplementation(() => Promise.reject(error));

        await expect(getWorkspaceDetails(params)).rejects.toThrow(error);
    });
});

describe('listBranches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test: ruft API mit korrekt konstruiertem Query-String auf', async () => {
        const params = { repositoryId: '123' };
        const expected = '/api/workspaces?repositoryId=123';
        const mockBranches: BranchItem[] = [
            { branch: 'main', lastModified: '2024-01-01', author: 'alice', isDefaultBranch: true, isProtected: true, mergeRequest: null },
            { branch: 'dev', lastModified: '2024-01-02', author: 'bob', isDefaultBranch: false, isProtected: false, mergeRequest: null }
        ];
        mockApi.mockResolvedValue(mockBranches);

        const result = await listBranches(params);
        expect(mockApi).toHaveBeenCalledTimes(1);
        expect(mockApi).toHaveBeenCalledWith(expected);
        expect(result).toEqual(mockBranches);
    });

    it('Test: kodiert Sonderzeichen korrekt', async () => {
        const params = { repositoryId: '456' };
        const qs = new URLSearchParams(params as any).toString();
        const expected = `/api/workspaces?${qs}`;
        mockApi.mockResolvedValue([] as BranchItem[]);
        await listBranches(params);
        expect(mockApi).toHaveBeenCalledWith(expected);
        expect(expected).toContain('456');

    });
});

describe('commitWorkspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test: sendet POST mit korrekt serialisiertem Body', async () => {
        const body = {
            repositoryId: 'r1',
            branch: 'feat-x',
            packageName: 'a.b.c',
            version: '1.2.3',
            message: 'Commit Nachricht',
            changes: [
                { action: 'update', type: 'template', fileName: 't1.json', content: '{ }' } as CommitChange
            ],
            createMergeRequest: true
        };
        mockApi.mockResolvedValue({ ok: true } as any);

        await commitWorkspace(body);

        expect(mockApi).toHaveBeenCalledTimes(1);
        const call = mockApi.mock.calls[0]!;
        const url = call[0];
        const init = call[1] as RequestInit;
        expect(url).toBe('/api/workspaces/commit');
        expect(init.method).toBe('POST');
        expect(typeof init.body).toBe('string');
        const parsed = JSON.parse(init.body as string);
        expect(parsed.repositoryId).toBe(body.repositoryId);
        expect(parsed.changes).toHaveLength(1);
        expect(parsed.createMergeRequest).toBe(true);
    });
    

    it('Test: createMergeRequest darf fehlen (optional)', async () => {
        const body = {
            repositoryId: 'r2',
            branch: 'main',
            packageName: 'x.y.z',
            version: '0.1.0',
            message: 'Msg',
            changes: [] as CommitChange[]
        };
        mockApi.mockResolvedValue({ ok: true } as any);
        await commitWorkspace(body);
        const call = mockApi.mock.calls[0]!;
        const init = call[1] as RequestInit;
        const parsed = JSON.parse(init.body as string);
        expect(parsed.createMergeRequest).toBeUndefined();
    });

    describe('approveAndMergeReview', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('Test: ruft API mit korrekt konstruiertem Query-String und POST auf', async () => {
            const params = { projectId: 'p1', mrId: '42' };

            const qs = new URLSearchParams({
                projectId: params.projectId,
                mrId: params.mrId,
            }).toString();

            const expectedUrl = `/api/reviews/approve?${qs}`;

            mockApi.mockResolvedValue('ok');

            const result = await approveAndMergeReview(params);

            expect(mockApi).toHaveBeenCalledTimes(1);
            expect(mockApi).toHaveBeenCalledWith(expectedUrl, {
                method: 'POST',
                responseType: 'text',
            });
            expect(result).toBe('ok');
        });

        it('Test: kodiert Sonderzeichen in Query-Parametern', async () => {
            const params = { projectId: 'proj 1', mrId: 'mr/42' };

            const qs = new URLSearchParams({
                projectId: params.projectId,
                mrId: params.mrId,
            }).toString();

            const expectedUrl = `/api/reviews/approve?${qs}`;

            mockApi.mockResolvedValue('merged');

            await approveAndMergeReview(params);

            expect(mockApi).toHaveBeenCalledWith(expectedUrl, {
                method: 'POST',
                responseType: 'text',
            });

            expect(expectedUrl).toContain('projectId=proj+1');
            expect(expectedUrl).toContain('mrId=mr%2F42');
        });

        it('Test: propagiert Fehler der API', async () => {
            const error = new Error('Network');
            (mockApi as any).mockImplementation(() => Promise.reject(error));

            await expect(approveAndMergeReview({ projectId: 'p', mrId: '1' }))
                .rejects.toThrow(error);
        });
    });
    describe('commitFile', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('Test: sendet POST auf /workspaces/commitFile mit FormData und Pflichtfeldern', async () => {
            // File ist in Vitest/Node je nach Setup vorhanden.
            // Falls dein Environment kein globales File hat, funktioniert new Blob(...) trotzdem,
            // aber commitFile erwartet File. In den meisten modernen Vitest Setups ist File vorhanden.
            const file = new File([new Blob(['hello'])], 'upload.txt', { type: 'text/plain' });

            mockApi.mockResolvedValue({ ok: true } as any);

            await commitFile({
                action: 'update',
                repositoryId: 'r1',
                branch: 'main',
                packageName: 'pkg',
                version: '1.0.0',
                file,
                fileName: 'path/in/repo/upload.txt',
            });

            expect(mockApi).toHaveBeenCalledTimes(1);

            const [url, init] = mockApi.mock.calls[0]!;
            expect(url).toBe('/api/workspaces/commitFile');

            const req = init as RequestInit;
            expect(req.method).toBe('POST');
            expect(req.body).toBeInstanceOf(FormData);

            const fd = req.body as FormData;
            const data = await formDataToObject(fd);

            expect(data.repositoryId).toBe('r1');
            expect(data.branch).toBe('main');
            expect(data.packageName).toBe('pkg');
            expect(data.version).toBe('1.0.0');

            expect(data.fileName).toBe('path/in/repo/upload.txt');
            expect(data.action).toBe('update');

            // file kommt als File/Blob durch
            expect(data.file).toBeInstanceOf(File);
            expect((data.file as File).name).toBe('upload.txt');

            // optional nicht gesetzt
            expect(data.message).toBeUndefined();
            expect(data.createMergeRequest).toBeUndefined();
        });

        it('Test: fügt message nur hinzu, wenn gesetzt', async () => {
            const file = new File([new Blob(['x'])], 'a.txt', { type: 'text/plain' });
            mockApi.mockResolvedValue({ ok: true } as any);

            await commitFile({
                action: 'create',
                repositoryId: 'r2',
                branch: 'feat',
                packageName: 'pkg2',
                version: '2.0.0',
                file,
                fileName: 'a.txt',
                message: 'My commit msg',
            });

            const [, init] = mockApi.mock.calls[0]!;
            const fd = (init as RequestInit).body as FormData;
            const data = await formDataToObject(fd);

            expect(data.message).toBe('My commit msg');
        });

        it('Test: createMergeRequest wird als String angehängt, wenn definiert (true)', async () => {
            const file = new File([new Blob(['x'])], 'a.txt', { type: 'text/plain' });
            mockApi.mockResolvedValue({ ok: true } as any);

            await commitFile({
                action: 'update',
                repositoryId: 'r3',
                branch: 'feat',
                packageName: 'pkg3',
                version: '3.0.0',
                file,
                fileName: 'a.txt',
                createMergeRequest: true,
            });

            const [, init] = mockApi.mock.calls[0]!;
            const fd = (init as RequestInit).body as FormData;
            const data = await formDataToObject(fd);

            expect(data.createMergeRequest).toBe('true');
        });

        it('Test: createMergeRequest wird als String angehängt, wenn definiert (false)', async () => {
            const file = new File([new Blob(['x'])], 'a.txt', { type: 'text/plain' });
            mockApi.mockResolvedValue({ ok: true } as any);

            await commitFile({
                action: 'update',
                repositoryId: 'r4',
                branch: 'feat',
                packageName: 'pkg4',
                version: '4.0.0',
                file,
                fileName: 'a.txt',
                createMergeRequest: false,
            });

            const [, init] = mockApi.mock.calls[0]!;
            const fd = (init as RequestInit).body as FormData;
            const data = await formDataToObject(fd);

            expect(data.createMergeRequest).toBe('false');
        });

        it('Test: propagiert Fehler der API', async () => {
            const file = new File([new Blob(['x'])], 'a.txt', { type: 'text/plain' });
            const error = new Error('Network');
            (mockApi as any).mockImplementation(() => Promise.reject(error));

            await expect(
                commitFile({
                    action: 'update',
                    repositoryId: 'r5',
                    branch: 'main',
                    packageName: 'pkg5',
                    version: '5.0.0',
                    file,
                    fileName: 'a.txt',
                }),
            ).rejects.toThrow(error);
        });
    });
});

describe('commitWorkspaceReview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test: sendet POST mit korrekt serialisiertem Body', async () => {
        const body = {
            repositoryId: 'r1',
            branch: 'feat-x',
            title: 'Review of 2.0.0'
        };
        mockApi.mockResolvedValue({ ok: true } as any);

        await commitWorkspaceReview(body);

        expect(mockApi).toHaveBeenCalledTimes(1);
        const call = mockApi.mock.calls[0]!;
        const url = call[0];
        const init = call[1] as RequestInit;
        expect(url).toBe('/api/workspaces/review');
        expect(init.method).toBe('POST');
        expect(typeof init.body).toBe('string');
        const parsed = JSON.parse(init.body as string);
        expect(parsed.repositoryId).toBe(body.repositoryId);
    });

    it('Test: propagiert Fehler der API', async () => {
        const error = new Error('Network');
        (mockApi as any).mockImplementation(() => Promise.reject(error));

        await expect(
            commitWorkspaceReview({
                repositoryId: 'r1',
                branch: 'main',
                title: 'Review of 2.0.0'
            }),
        ).rejects.toThrow(error);
    });
});