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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import ProjectOverview from '../../pages/ProjectOverview.vue';

// Globale Mocks
const mockDialogWarning = vi.fn();

// Mock naive-ui components
vi.mock('naive-ui', () => {
    return {
        NButton: {
            name: 'NButton',
            props: ['type', 'title', 'size', 'disabled'],
            emits: ['click'],
            template: '<button @click="$emit(\'click\', $event)" class="n-button" :disabled="disabled"><slot /></button>'
        },
        NSpace: {
            template: '<div class="n-space"><slot /></div>'
        },
        NSpin: {
            template: '<div class="n-spin"><slot /></div>'
        },
        NAlert: {
            name: 'NAlert',
            props: ['type', 'title', 'showIcon', 'closable'],
            emits: ['close'],
            template: `
                <div class="n-alert" :data-type="type">
                    <div class="n-alert-body">
                        <div v-if="title" class="n-alert-body__title">{{ title }}</div>
                        <div class="n-alert-body__content"><slot /></div> 
                    </div>
                </div>
            `
        },
        NTooltip: {
            name: 'NTooltip',
            props: ['trigger'],
            template: '<div class="n-tooltip"><slot name="trigger" /><slot /></div>'
        },
        useDialog: () => ({
            warning: mockDialogWarning
        })
    };
});

// Mock router
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
        { path: '/version/:projectId/:packageName/:version/:workspace', name: 'versionDetails', component: { template: '<div>Version Details</div>' } }
    ]
});

// Test Utilities
const fmtDate = (iso: string) => new Date(iso).toLocaleString();

const RouterLinkStub = {
    name: 'RouterLinkStub',
    template: '<a data-test="router-link" :data-to="JSON.stringify(to)"><slot /></a>',
    props: ['to']
};

// Shared reactive state
let mockState: any;

beforeEach(() => {
    vi.clearAllMocks();
    mockDialogWarning.mockClear();

    mockState = {
        loading: false,
        progress: 0,
        statusMessage: { type: 'info', message: null },
        isLoggedIn: true,
        canEdit: true,
        projects: [
            {
                projectId: 1,
                title: 'test.package.de',
                description: 'Test package',
                lastModified: new Date().toISOString(),
                mrStatus: 'Draft',
                expanded: false,
                versions: [
                    {
                        version: '1.0.0',
                        lastModified: new Date().toISOString(),
                        mrStatus: 'Draft',
                        branch: 'feature/test'
                    },
                    {
                        version: '1.1.0',
                        lastModified: new Date().toISOString(),
                        mrStatus: 'Final',
                        branch: 'main'
                    }
                ]
            }
        ],
        lastUpdated: new Date()
    };
});

// Mock useProjects composable
vi.mock('../../composables/useProjects', () => {
    const badgeClass = (status: string) => {
        switch (status) {
            case 'Final': return 'badge-final';
            case 'Draft': return 'badge-draft';
            default: return 'badge-default';
        }
    };

    const toggleVersions = vi.fn((p: any) => {
        p.expanded = !p.expanded;
    });

    const loadProjects = vi.fn(() => {
        mockState.loading = true;
        mockState.progress = 0;
        setTimeout(() => {
            mockState.progress = 100;
            mockState.loading = false;
            mockState.lastUpdated = new Date();
        }, 100);
    });

    const onAddNewVersion = vi.fn();
    const deleteVersion = vi.fn();

    return {
        useProjects: () => ({
            loading: mockState.loading,
            progress: mockState.progress,
            statusMessage: mockState.statusMessage,
            projects: mockState.projects,
            lastUpdated: mockState.lastUpdated,
            isLoggedIn: mockState.isLoggedIn,
            canEdit: mockState.canEdit,
            fmtDate,
            loadProjects,
            startAutoRefresh: vi.fn(),
            stopAutoRefresh: vi.fn(),
            clearProjects: vi.fn(),
            badgeClass,
            toggleVersions,
            onAddNewVersion,
            deleteVersion
        })
    };
});

// Mock useStatusMessage
vi.mock('../../composables/useStatusMessage', () => ({
    useStatusMessage: vi.fn()
}));

const createWrapper = (options: { global?: Record<string, any> } = {}) => mount(ProjectOverview, {
    global: {
        plugins: [router],
        stubs: {
            'router-link': RouterLinkStub,
        },
        ...(options.global ?? {})
    }
});

describe('Test: ProjectOverview.vue', () => {
    describe('Test: Grundlegendes Rendering', () => {
        it('Test: zeigt Toolbar und letzte Aktualisierung', () => {
            const wrapper = createWrapper();

            expect(wrapper.find('.projects-title').text()).toContain('Übersicht der Projekte');
            expect(wrapper.find('.projects-refresh').exists()).toBe(true);
            expect(wrapper.find('.projects-lastupdate').text()).toContain('Letzte Aktualisierung');
        });

        it('Test: zeigt Fortschritt beim Laden', async () => {
            mockState.loading = true;
            mockState.progress = 42;

            const wrapper = createWrapper();

            const progress = wrapper.find('.projects-progress');
            expect(progress.exists()).toBe(true);
            expect(progress.find('.progress-text').text()).toContain('42%');
        });

        it('Test: rendert Projekte-Akkordeon mit Badges', () => {
            const wrapper = createWrapper();

            const items = wrapper.findAll('.accordion-item');
            expect(items).toHaveLength(1);
            expect(wrapper.find('.badge').text()).toContain('Draft');
        });

        it('Test: zeigt Hinweis bei keinen Projekten', () => {
            mockState.projects = [];

            const wrapper = createWrapper();

            expect(wrapper.find('.text-muted').text()).toContain('Keine Projekte gefunden.');
        });

        it('Test: zeigt Login-Hinweis wenn nicht eingeloggt', () => {
            mockState.isLoggedIn = false;

            const wrapper = createWrapper();

            expect(wrapper.find('.n-alert').exists()).toBe(true);
            expect(wrapper.find('.n-alert-body__content').text()).toContain('Bitte melden Sie sich an');
        });
    });

    describe('Test: Akkordeon-Interaktionen', () => {
        it('Test: klappt Versionsliste per Header-Klick um', async () => {
            const wrapper = createWrapper();

            const headerBtn = wrapper.find('.accordion-header');
            
            // Initial nicht expanded
            expect(mockState.projects[0].expanded).toBe(false);

            await headerBtn.trigger('click');
            
            expect(mockState.projects[0].expanded).toBe(true);
        });
    });

    describe('Test: Rendering der Versions-Einträge', () => {
        it('Test: zeigt korrekte Badges und Tooltips basierend auf mrStatus', async () => {
            mockState.projects = [
                {
                    projectId: 1,
                    title: 'released.project.de',
                    description: 'Released project',
                    lastModified: new Date().toISOString(),
                    mrStatus: 'Released Edit',
                    expanded: true,
                    versions: [
                        {
                            version: '2.0.0',
                            lastModified: new Date().toISOString(),
                            mrStatus: 'Released Edit',
                            branch: 'feature/2.0.0'
                        },
                        {
                            version: '2.1.0',
                            lastModified: new Date().toISOString(),
                            mrStatus: 'Draft',
                            branch: 'feature/2.1.0'
                        }
                    ]
                },
                {
                    projectId: 2,
                    title: 'draft.project.de',
                    description: 'Draft project',
                    lastModified: new Date().toISOString(),
                    mrStatus: 'Draft',
                    expanded: false,
                    versions: []
                }
            ];

            const wrapper = createWrapper();
            await flushPromises();

            const tooltipText = 'Diese Version ist bereits veröffentlicht und hat aktuell Änderungen im Review.';
            expect(wrapper.text()).toContain(tooltipText);

            const badges = wrapper.findAll('.badge').map((b) => b.text());
            expect(badges).toContain('in Review');
            expect(badges).toContain('Draft');
        });

        it('Test: rendert Einträge mit korrekten Links und Buttons', async () => {
            mockState.projects[0].expanded = true;

            const wrapper = createWrapper();

            await flushPromises();
            await wrapper.vm.$nextTick();

            const versionItems = wrapper.findAll('.version-item-flex-wrapper');
            expect(versionItems).toHaveLength(2);

            const draftVersion = versionItems[0];
            const deleteButton = draftVersion?.find('button');
            expect(deleteButton?.exists()).toBe(true);
           expect(deleteButton?.find('img[alt="Löschen"]').exists()).toBe(true);

            const finalVersion = versionItems[1];
            const viewButton = finalVersion?.find('a.text-gray-400');
            expect(viewButton?.exists()).toBe(true);

            const versionTitles = wrapper.findAll('.version-title');
            expect(versionTitles[0]?.text()).toContain('1.0.0');
            expect(versionTitles[1]?.text()).toContain('1.1.0');

            const badges = wrapper.findAll('.badge');
            expect(badges.length).toBeGreaterThan(0);
        });
    });

    describe('Test: Aktionen', () => {
        it('Test: ruft onAddNewVersion beim Klick auf', async () => {
            const { useProjects } = await import('../../composables/useProjects');
            const api = useProjects();

            mockState.projects[0].expanded = true;

            const wrapper = createWrapper();
            await flushPromises();

            const addButton = wrapper.find('button.n-button');
            expect(addButton.text()).toContain('Neue Version');

            await addButton.trigger('click');

            expect(api.onAddNewVersion).toHaveBeenCalledTimes(1);
            expect(api.onAddNewVersion).toHaveBeenCalledWith('1', 'test.package.de');
        });

        it('Test: startet Lösch-Flow beim Löschen-Button', async () => {
            const { useProjects } = await import('../../composables/useProjects');
            const api = useProjects();

            mockState.projects[0].expanded = true;

            const wrapper = createWrapper();
            await flushPromises();

            const deleteButton = wrapper.find('button.text-red-600');
            await deleteButton?.trigger('click');

            expect(mockDialogWarning).toHaveBeenCalledTimes(1);

            const dialogArgs = mockDialogWarning.mock.calls[0]![0];
            expect(dialogArgs.title).toContain('Version löschen');
            expect(dialogArgs.positiveText).toContain('löschen');

            dialogArgs.onPositiveClick();
            expect(api.deleteVersion).toHaveBeenCalledWith(1, '1.0.0', 'feature/test');
        });

        it('Test: lädt Projekte über Toolbar-Button neu', async () => {
            const { useProjects } = await import('../../composables/useProjects');
            const api = useProjects();

            const wrapper = createWrapper();

            const refreshBtn = wrapper.find('.projects-refresh');
            await refreshBtn.trigger('click');

            expect(api.loadProjects).toHaveBeenCalledTimes(1);
        });
    });

    describe('Test: Status-Meldungen', () => {
        it('Test: zeigt Status-Meldungen korrekt an', async () => {
            mockState.statusMessage = { message: 'Test-Nachricht', type: 'success' };

            const wrapper = createWrapper();
            await flushPromises();

            const alert = wrapper.find('.n-alert');
            expect(alert.exists()).toBe(true);
            expect(alert.attributes('data-type')).toBe('success');
            expect(wrapper.find('.n-alert-body__content').text()).toBe('Test-Nachricht');
        });

        it('Test: zeigt keinen Alert ohne Status-Meldung', async () => {
            mockState.statusMessage = { message: null, type: 'info' };

            const wrapper = createWrapper();
            await flushPromises();

            const alert = wrapper.find('.n-alert');
            expect(alert.exists()).toBe(false);
        });
    });

    describe('Test: Berechtigungen', () => {
        it('Test: deaktiviert Buttons wenn canEdit false', async () => {
            mockState.canEdit = false;
            mockState.projects[0].expanded = true;

            const wrapper = createWrapper();
            await flushPromises();

            // Neue Version Button sollte disabled sein
            const addButton = wrapper.find('button.n-button');
            expect(addButton.attributes('disabled')).toBeDefined();

            // Lösch-Button sollte deaktiviert und grau sein
            const deleteButton = wrapper.find('button.text-gray-400');
            expect(deleteButton.exists()).toBe(true);
            expect(deleteButton.attributes('disabled')).toBeDefined();
        });
    });
});