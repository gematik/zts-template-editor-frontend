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
import { reactive, ref, nextTick } from 'vue';
import { useTemplatesManagement } from '../../composables/useTemplatesManagement';

const mockIsLoggedIn = ref(true);
const mockIsReviewer = ref(false);
const mockRouterPush = vi.fn();

const mockRoute = reactive({
    params: reactive({
        projectId: '42',
        packageName: 'demo-package',
        version: '1.2.3',
        workspace: 'dev',
    }),
});

const getWorkspaceDetailsMock = vi.fn();
const commitWorkspaceMock = vi.fn();
const commitWorkspaceReviewMock = vi.fn();
const fetchDefaultBranchMock = vi.fn();
const fetchDefaultBranchVersionsMock = vi.fn();
const validatePackageTemplateMock = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-router')>();

    return {
        ...actual,
        useRoute: () => mockRoute,
    };
});

vi.mock('../../composables/useAuth', () => ({
    useAuth: () => ({
        isLoggedIn: mockIsLoggedIn,
        router: {
            push: mockRouterPush,
        },
    }),
}));

vi.mock('../../composables/useUserinfo', () => ({
    useUserinfo: () => ({
        isReviewer: mockIsReviewer,
    }),
}));

vi.mock('../../api/workspaces', () => ({
    getWorkspaceDetails: (...args: unknown[]) => getWorkspaceDetailsMock(...args),
    commitWorkspace: (...args: unknown[]) => commitWorkspaceMock(...args),
    commitWorkspaceReview: (...args: unknown[]) => commitWorkspaceReviewMock(...args),
}));

vi.mock('../../services/projectService', () => ({
    fetchDefaultBranch: (...args: unknown[]) => fetchDefaultBranchMock(...args),
    fetchDefaultBranchVersions: (...args: unknown[]) => fetchDefaultBranchVersionsMock(...args),
}));

vi.mock('../../validation/rules', () => ({
    validatePackageTemplate: (...args: unknown[]) => validatePackageTemplateMock(...args),
}));

vi.mock('../../utils/logger', () => ({
    logger: {
        scope: () => ({
            debug: vi.fn(),
            info: vi.fn(),
            error: vi.fn(),
        }),
    },
}));

function createWorkspaceDetails(overrides: Record<string, unknown> = {}) {
    return {
        packageTemplateJson: JSON.stringify({
            packagename: 'demo-package',
            version: '1.2.3',
            title: 'Titel',
            description: 'Beschreibung',
            author: 'Max',
            dependencies: 'dep',
            altTitle: 'Alt',
            keywords: ['a', 'b'],
            copyright: 'Copyright',
        }),
        metadatenJson: JSON.stringify({
            'package-name': 'demo-package',
            'package-version': '1.2.3',
        }),
        changelogsJson: JSON.stringify({
            'package-name': 'demo-package',
            'package-version': '1.2.3',
            changes: ['foo'],
        }),
        externalSourcesMd: 'external',
        fhirConversionNotesMd: 'fhir',
        noteOnAuthorMd: 'author',
        notesOnUpdateCyclesMd: 'cycles',
        descriptionGenericMd: 'generic',
        downloadConditionsXml: '<xml />',
        inputFiles: JSON.stringify([{ name: 'file-a' }]),
        templatesMd: [
            {
                canonicalUrl: 'http://example.org/A',
                version: '1.0.0',
                markdown: '# A',
            },
        ],
        templatesJson: [
            {
                name: 'TemplateA',
                json: { foo: 'bar' },
            },
        ],
        ...overrides,
    };
}

async function flushAll() {
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
}

describe('useTemplatesManagement', () => {
    beforeEach(() => {
        vi.useRealTimers();

        mockIsLoggedIn.value = true;
        mockIsReviewer.value = false;

        mockRoute.params.projectId = '42';
        mockRoute.params.packageName = 'demo-package';
        mockRoute.params.version = '1.2.3';
        mockRoute.params.workspace = 'dev';

        mockRouterPush.mockReset();
        getWorkspaceDetailsMock.mockReset();
        commitWorkspaceMock.mockReset();
        commitWorkspaceReviewMock.mockReset();
        fetchDefaultBranchMock.mockReset();
        fetchDefaultBranchVersionsMock.mockReset();
        validatePackageTemplateMock.mockReset();

        fetchDefaultBranchMock.mockResolvedValue({ branch: 'dev' });
        fetchDefaultBranchVersionsMock.mockResolvedValue([]);
        validatePackageTemplateMock.mockReturnValue({});
        getWorkspaceDetailsMock.mockResolvedValue(createWorkspaceDetails());
        commitWorkspaceMock.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('initialisiert im edit mode erfolgreich und lädt Details', async () => {
        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        expect(m.hasDetails.value).toBe(true);
        expect(m.loadedPackageData.value?.pkgJson.packagename).toBe('demo-package');
        expect(m.loadedPackageData.value?.pkgJson.version).toBe('1.2.3');
        expect(m.templateMarkdownStates.value).toEqual([
            {
                originalCanonicalUrl: 'http://example.org/A',
                canonicalUrl: 'http://example.org/A',
                originalVersion: '1.0.0',
                version: '1.0.0',
                markdown: '# A',
            },
        ]);
        expect(m.templateJsonStates.value).toEqual([
            {
                name: 'TemplateA',
                json: JSON.stringify({ foo: 'bar' }, null, 2),
                jsonValid: true,
            },
        ]);
        expect(m.isVersionReleased.value).toBe(true);
    });

    it('setzt im edit/createFrom mode den selectedBranch aus der Route', async () => {
        mockRoute.params.workspace = 'feature/test-123';

        const m = useTemplatesManagement('createFrom');
        await flushAll();

        expect(m.selectedBranch.value).toBe('feature/test-123');
    });

    it('setzt im create mode den selectedBranch leer', async () => {
        mockRoute.params.workspace = 'feature/test-123';

        const m = useTemplatesManagement('create');
        await flushAll();

        expect(m.selectedBranch.value).toBe('');
    });

    it('setzt Fehlerstatus wenn im edit mode kein workspace vorhanden ist', async () => {
        mockRoute.params.workspace = '';

        const m = useTemplatesManagement('edit');
        await flushAll();

        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Kein Arbeitsbereich in der Route gefunden.',
            debug: null,
        });
    });

    it('bricht Initialisierung ab wenn nicht eingeloggt und leert State', async () => {
        mockIsLoggedIn.value = false;

        const m = useTemplatesManagement('edit');
        await flushAll();

        expect(m.workspaceDetails.value).toBeNull();
        expect(m.loadedPackageData.value).toBeNull();
        expect(m.previousVersions.value).toEqual([]);
        expect(m.statusMessage.value).toEqual({
            type: null,
            title: null,
            message: null,
            debug: null,
        });
    });

    it('setzt beim Logout den State zurück', async () => {
        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        expect(m.hasDetails.value).toBe(true);

        mockIsLoggedIn.value = false;
        await flushAll();

        expect(m.workspaceDetails.value).toBeNull();
        expect(m.loadedPackageData.value).toBeNull();
        expect(m.templateMarkdownStates.value).toEqual([]);
        expect(m.templateJsonStates.value).toEqual([]);
        expect(m.previousVersions.value).toEqual([]);
        expect(m.previousVersionSelected.value).toBeNull();
        expect(m.statusMessage.value).toEqual({
            type: null,
            title: null,
            message: null,
            debug: null,
        });
    });

    it('setzt loadDetails auf leer wenn mode keinen Workspace laden soll', async () => {
        const m = useTemplatesManagement('create');
        await flushAll();

        m.workspaceDetails.value = createWorkspaceDetails() as any;
        m.loadedPackageData.value = { foo: 'bar' } as any;
        m.templateMarkdownStates.value = [{ foo: 'bar' } as any];
        m.templateJsonStates.value = [{ foo: 'bar' } as any];

        await m.loadDetails();

        expect(m.workspaceDetails.value).toBeNull();
        expect(m.loadedPackageData.value).toBeNull();
        expect(m.templateMarkdownStates.value).toEqual([]);
        expect(m.templateJsonStates.value).toEqual([]);
    });

    it('setzt Fehlerstatus wenn loadDetails fehlschlägt', async () => {
        getWorkspaceDetailsMock.mockRejectedValueOnce(new Error('kaputt'));

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        expect(m.loadedPackageData.value).toBeNull();
        expect(m.workspaceDetails.value).toBeNull();
        expect(m.templateMarkdownStates.value).toEqual([]);
        expect(m.templateJsonStates.value).toEqual([]);
        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'kaputt',
            debug: null,
        });
    });

    it('setzt createFrom warnings aus validatePackageTemplate', async () => {
        validatePackageTemplateMock.mockReturnValue({
            version: 'required',
            title: 'required',
        });

        const m = useTemplatesManagement('createFrom');
        await flushAll();
        await flushAll();

        expect(m.previousVersionWarnings.value).toEqual({
            warnings: [
                'Package JSON: Ungültige oder fehlende Felder → version (required), title (required)',
            ],
            version: '1.2.3',
        });
    });

    it('setzt createFrom warning wenn Details nicht geladen werden konnten', async () => {
        getWorkspaceDetailsMock.mockRejectedValueOnce(new Error('kaputt'));

        const m = useTemplatesManagement('createFrom');
        await flushAll();
        await flushAll();

        expect(m.previousVersionWarnings.value).toEqual({
            warnings: ['Fehler beim Laden der ausgewählten Version.'],
            version: '',
        });
    });

    it('lädt im create mode den Default Branch und sortiert vorige Versionen absteigend', async () => {
        fetchDefaultBranchMock.mockResolvedValueOnce({ branch: 'main' });
        fetchDefaultBranchVersionsMock.mockResolvedValueOnce([
            { version: '1.0.0' },
            { version: '2.0.0' },
            { version: '1.5.0' },
        ]);

        const m = useTemplatesManagement('create');
        await flushAll();
        await flushAll();

        expect(m.defaultBranch.value).toEqual({ branch: 'main' });
        expect(m.previousVersions.value).toEqual([
            { version: '2.0.0' },
            { version: '1.5.0' },
            { version: '1.0.0' },
        ]);
        expect(m.previousVersionState.value).toBe('loaded');
        expect(m.previousVersionSelected.value).toBeNull();
    });

    it('setzt im create mode previousVersionState auf noVersions wenn keine Versionen da sind', async () => {
        fetchDefaultBranchMock.mockResolvedValueOnce({ branch: 'main' });
        fetchDefaultBranchVersionsMock.mockResolvedValueOnce([]);

        const m = useTemplatesManagement('create');
        await flushAll();
        await flushAll();

        expect(m.previousVersionState.value).toBe('noVersions');
        expect(m.previousVersions.value).toEqual([]);
    });

    it('setzt im create mode previousVersionState auf error wenn Laden fehlschlägt', async () => {
        fetchDefaultBranchMock.mockResolvedValueOnce({ branch: 'main' });
        fetchDefaultBranchVersionsMock.mockRejectedValueOnce(new Error('kaputt'));

        const m = useTemplatesManagement('create');
        await flushAll();
        await flushAll();

        expect(m.defaultBranch.value).toBeNull();
        expect(m.previousVersions.value).toEqual([]);
        expect(m.previousVersionSelected.value).toBeNull();
        expect(m.previousVersionState.value).toBe('error');
    });

    it('setzt defaultBranch auf null wenn Default-Branch-Info im edit mode fehlschlägt', async () => {
        fetchDefaultBranchMock.mockRejectedValueOnce(new Error('kaputt'));

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        expect(m.defaultBranch.value).toBeNull();
    });

    it('setzt isVersionReleased auf false wenn Version auf Default Branch nicht existiert', async () => {
        mockRoute.params.workspace = 'feature/abc';

        getWorkspaceDetailsMock
            .mockResolvedValueOnce(createWorkspaceDetails())
            .mockResolvedValue(createWorkspaceDetails({ packageTemplateJson: '' }));

        fetchDefaultBranchMock.mockResolvedValueOnce({ branch: 'main' });

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();
        await flushAll();

        expect(m.isVersionReleased.value).toBe(false);
    });

    it('canEdit ist false für Reviewer', async () => {
        mockIsReviewer.value = true;

        const m = useTemplatesManagement('create');
        await flushAll();

        expect(m.canEdit.value).toBe(false);
        expect(m.canApprove.value).toBe(true);
    });

    it('canEdit ist true auf nicht geschütztem Branch im edit mode', async () => {
        mockRoute.params.workspace = 'feature/my-branch';

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        expect(m.canEdit.value).toBe(true);
    });

    it('canEdit ist true auf geschütztem Branch wenn Version released ist', async () => {
        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        m.selectedBranch.value = 'main';
        m.isVersionReleased.value = true;
        await nextTick();

        expect(m.canEdit.value).toBe(true);
    });

    it('addMarkdownTemplate und removeMarkdownTemplate funktionieren', async () => {
        const m = useTemplatesManagement('create');
        await flushAll();

        expect(m.templateMarkdownStates.value).toEqual([]);

        m.addMarkdownTemplate();
        expect(m.templateMarkdownStates.value).toEqual([
            {
                originalCanonicalUrl: undefined,
                canonicalUrl: '',
                originalVersion: undefined,
                version: '',
                markdown: '',
            },
        ]);

        m.removeMarkdownTemplate(0);
        expect(m.templateMarkdownStates.value).toEqual([]);

        m.removeMarkdownTemplate(999);
        expect(m.templateMarkdownStates.value).toEqual([]);
    });

    it('performSave setzt Fehler wenn nicht eingeloggt', async () => {
        mockIsLoggedIn.value = false;

        const m = useTemplatesManagement('create');
        await flushAll();

        await m.performSave([], '2.0.0', true);

        expect(commitWorkspaceMock).not.toHaveBeenCalled();
        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Sie müssen eingeloggt sein, um Änderungen zu speichern.',
            debug: null,
        });
    });

    it('performSave bricht ab wenn saving bereits true ist', async () => {
        const m = useTemplatesManagement('create');
        await flushAll();

        m.saving.value = true;
        await m.performSave([], '2.0.0', true);

        expect(commitWorkspaceMock).not.toHaveBeenCalled();
    });

    it('performSave erstellt im create mode Feature-Branch und navigiert danach', async () => {
        vi.useFakeTimers();

        const m = useTemplatesManagement('create');
        await flushAll();

        const savePromise = m.performSave([{ path: 'a', content: 'b' } as any], '2.0.0', true);

        await vi.advanceTimersByTimeAsync(1500);
        await savePromise;
        await flushAll();

        expect(commitWorkspaceMock).toHaveBeenCalledWith({
            repositoryId: '42',
            branch: 'feature/2.0.0',
            packageName: 'demo-package',
            version: '2.0.0',
            message: 'Neues Package für die Version 2.0.0 des FHIR Package demo-package auf Branch feature/2.0.0 erstellt',
            changes: [{ path: 'a', content: 'b' }],
            createMergeRequest: true,
        });

        expect(mockRouterPush).toHaveBeenCalledWith({
            name: 'versionDetails',
            params: {
                projectId: '42',
                packageName: 'demo-package',
                version: '2.0.0',
                workspace: 'feature/2.0.0',
            },
        });

        expect(m.statusMessage.value.type).toBe('success');
    });

    it('performSave speichert auf Feature-Branch wenn veröffentlichte Version auf geschütztem Branch bearbeitet wird', async () => {
        vi.useFakeTimers();

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        m.selectedBranch.value = 'main';
        m.isVersionReleased.value = true;
        await nextTick();

        const savePromise = m.performSave([], '1.2.3', false);

        await vi.advanceTimersByTimeAsync(1500);
        await savePromise;
        await flushAll();

        expect(commitWorkspaceMock).toHaveBeenCalledWith({
            repositoryId: '42',
            branch: 'feature/1.2.3',
            packageName: 'demo-package',
            version: '1.2.3',
            message: 'Für die veröffentlichte Version 1.2.3 des FHIR Package demo-package wurde eine bearbeitete Fassung auf Branch feature/1.2.3 erstellt',
            changes: [],
            createMergeRequest: false,
        });

        expect(mockRouterPush).toHaveBeenCalled();
    });

    it('performSave lädt im normalen edit flow nach erfolgreichem Speichern neu', async () => {
        mockRoute.params.workspace = 'feature/work';

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        getWorkspaceDetailsMock.mockClear();

        await m.performSave([], '1.2.3', false);
        await flushAll();

        expect(commitWorkspaceMock).toHaveBeenCalledWith({
            repositoryId: '42',
            branch: 'feature/work',
            packageName: 'demo-package',
            version: '1.2.3',
            message: 'Änderungen für die Version 1.2.3 des FHIR Package demo-package wurden gespeichert',
            changes: [],
            createMergeRequest: false,
        });

        expect(getWorkspaceDetailsMock).toHaveBeenCalled();
        expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('performSave setzt im create mode Fehlermeldung bei Fehler', async () => {
        commitWorkspaceMock.mockRejectedValueOnce(new Error('Boom'));

        const m = useTemplatesManagement('create');
        await flushAll();

        await m.performSave([], '2.0.0', false);

        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Beim Erstellen ist ein Fehler aufgetreten. Boom',
            debug: null,
        });
    });

    it('performSave setzt im edit mode Fehlermeldung bei Fehler', async () => {
        mockRoute.params.workspace = 'feature/work';
        commitWorkspaceMock.mockRejectedValueOnce(new Error('Boom'));

        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        await m.performSave([], '1.2.3', false);

        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Beim Speichern ist ein Fehler aufgetreten. Boom',
            debug: null,
        });
    });

    it('startReviewWithoutCommit setzt Fehler wenn nicht eingeloggt', async () => {
        mockIsLoggedIn.value = false;

        const m = useTemplatesManagement('edit');
        await flushAll();

        await m.startReviewWithoutCommit('2.0.0');

        expect(commitWorkspaceReviewMock).not.toHaveBeenCalled();
        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Sie müssen eingeloggt sein, um Änderungen zu speichern.',
            debug: null,
        });
    });

    it('startReviewWithoutCommit bricht ab wenn saving bereits true ist', async () => {
        const m = useTemplatesManagement('edit');
        await flushAll();

        m.saving.value = true;
        await m.startReviewWithoutCommit('2.0.0');

        expect(commitWorkspaceReviewMock).not.toHaveBeenCalled();
    });

    it('startReviewWithoutCommit setzt im edit mode Fehlermeldung bei Fehler', async () => {
        commitWorkspaceReviewMock.mockRejectedValueOnce(new Error('Boom'));

        const m = useTemplatesManagement('edit');
        await flushAll();

        await m.startReviewWithoutCommit('2.0.0');

        expect(m.statusMessage.value).toEqual({
            type: 'error',
            title: 'Fehler',
            message: 'Beim Starten des Reviews ist ein Fehler aufgetreten. Boom',
            debug: null,
        });
    });

    it('startReviewWithoutCommit startet Review erfolgreich', async () => {
        commitWorkspaceReviewMock.mockResolvedValueOnce(undefined);
        
        const m = useTemplatesManagement('edit');
        await flushAll();

        m.selectedBranch.value = 'feature/work';
        await m.startReviewWithoutCommit('2.0.0');
        
        expect(commitWorkspaceReviewMock).toHaveBeenCalledWith({
            repositoryId: '42',
            branch: 'feature/work',
            title: 'Review of 2.0.0',
        });

        expect(m.statusMessage.value.type).toBe('success');
    });

    it('reagiert auf Route-Änderungen und initialisiert neu', async () => {
        const m = useTemplatesManagement('edit');
        await flushAll();
        await flushAll();

        getWorkspaceDetailsMock.mockClear();

        mockRoute.params.workspace = 'feature/changed';
        await flushAll();
        await flushAll();

        expect(m.selectedBranch.value).toBe('feature/changed');
        expect(getWorkspaceDetailsMock).toHaveBeenCalled();
    });
});
