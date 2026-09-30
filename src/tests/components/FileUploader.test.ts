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
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

vi.mock('../../api/workspaces', () => ({
    commitFile: vi.fn(),
    commitWorkspace: vi.fn(),
}));

vi.mock('../../utils/utils', () => ({
    fmtDate: () => '01.01.2026',
}));

const naiveMocks = vi.hoisted(() => {
    return {
        messageApi: {
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn(),
            info: vi.fn(),
        },
        dialogApi: {
            warning: vi.fn(async (opts: any) => {
                if (opts?.onPositiveClick) await opts.onPositiveClick();
            }),
        },
    };
});

vi.mock('naive-ui', () => {
    return {
        useMessage: () => naiveMocks.messageApi,
        useDialog: () => naiveMocks.dialogApi,
    };
});

vi.mock('@vicons/fluent', () => {
    const IconStub = defineComponent({ name: 'IconStub', setup: () => () => h('i') });
    return {
        Archive48Regular: IconStub,
        Document48Regular: IconStub,
        Delete24Regular: IconStub,
    };
});

import * as workspacesApi from '../../api/workspaces';
import FileUploader from '../../components/FileUploader.vue';

const commitFileMock = vi.mocked(workspacesApi.commitFile);
const commitWorkspaceMock = vi.mocked(workspacesApi.commitWorkspace);

function makeUploadInfo(name: string, size = 10, type = 'text/plain') {
    const file = new File([new Uint8Array(size)], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return { id: name, name, status: 'pending', file };
}

function makeUploadInfoNoFile(name: string) {
    return { id: name, name, status: 'pending', file: undefined as any };
}

function flush() {
    return new Promise((r) => setTimeout(r, 0));
}

type StatusPayload = { type: string | null; message: string | null };
type InputFile = { name: string; lastModified: string; size: number; type: string };

const BasicStub = defineComponent({
    name: 'BasicStub',
    setup(_, { slots, attrs }) {
        return () => h('div', { ...attrs }, slots.default?.());
    },
});

const NButtonTag = defineComponent({
    name: 'NButtonTag',
    props: { disabled: Boolean, loading: Boolean },
    emits: ['click'],
    setup(props, { emit, slots, attrs }) {
        return () =>
            h(
                'button',
                {
                    ...attrs,
                    disabled: props.disabled,
                    'data-loading': props.loading ? '1' : '0',
                    onClick: () => emit('click'),
                },
                slots.default?.()
            );
    },
});

const NUploadTag = defineComponent({
    name: 'NUploadTag',
    emits: ['change', 'remove', 'before-upload'],
    setup(_, { emit, slots, expose, attrs }) {
        const emitChange = (fileList: any[]) => emit('change', { fileList });
        const emitRemove = (file: any, fileList: any[]) => emit('remove', { file, fileList });
        const emitBeforeUpload = (file: any, fileList: any[]) => emit('before-upload', { file, fileList });

        expose({ emitChange, emitRemove, emitBeforeUpload });

        return () => h('div', { ...attrs, 'data-stub': 'n-upload' }, slots.default?.());
    },
});

function mountIt(extraProps: any = {}) {
    return mount(FileUploader as any, {
        props: {
            repositoryId: 'repo1',
            branch: 'main',
            packageName: 'pkg',
            version: '1.0.0',
            ...extraProps,
        },
        global: {
            components: {
                'n-upload': NUploadTag,
                'n-upload-dragger': BasicStub,
                'n-button': NButtonTag,
                'n-card': BasicStub,
                'n-list': BasicStub,
                'n-list-item': BasicStub,
                'n-icon': BasicStub,
                'n-tag': BasicStub,
                'n-text': BasicStub,
                'n-p': BasicStub,
            },
        },
    });
}

function getLastStatus(wrapper: any): StatusPayload {
    const emits = wrapper.emitted('update:status-message') ?? [];
    expect(emits.length).toBeGreaterThan(0);

    const lastCall = emits[emits.length - 1];
    const payload = lastCall?.[0] as StatusPayload | undefined;

    expect(payload).toBeDefined();
    if (!payload) throw new Error('Missing status payload');
    return payload;
}

function getUploadComponent(wrapper: any) {
    const upload = wrapper.findComponent(NUploadTag);
    expect(upload.exists()).toBe(true);
    return upload;
}

describe('FileUploader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('accepts valid xml file selection', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('a.xml')] });
        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('info');
    });

    it('rejects invalid extension', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('bad.exe')] });
        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('kein gültiges Format');
    });

    it('rejects mixed zip + xml', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('a.zip'), makeUploadInfo('b.xml')] });
        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('nicht gleichzeitig ZIP');
    });

    it('rejects oversized file (>100MB)', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        const over = makeUploadInfo('big.json', 101 * 1024 * 1024);
        upload.vm.$emit('change', { fileList: [over] });
        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('zu groß');
    });

    it('uploads files successfully', async () => {
        commitFileMock.mockResolvedValue({ commitId: 'c1' });

        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('a.xml'), makeUploadInfo('b.xml')] });
        await wrapper.vm.$nextTick();

        const buttons = wrapper.findAll('button');
        expect(buttons.length).toBeGreaterThan(0);
        await buttons[0]?.trigger('click');

        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        expect(commitFileMock).toHaveBeenCalledTimes(2);

        const successEmits = wrapper.emitted('upload-success') ?? [];
        expect(successEmits.length).toBeGreaterThan(0);

        const payload = successEmits?.[0]?.[0] as any[];
        expect(payload).toBeDefined();
        if (!payload) throw new Error('Missing upload-success payload');

        expect(payload.length).toBe(2);
        expect(payload).toContain('a.xml');
        expect(payload).toContain('b.xml');
        expect(payload).toEqual(['a.xml', 'b.xml']);

        const statusEmits = wrapper.emitted('update:status-message');
        expect(statusEmits).toBeTruthy();

        const lastStatus = statusEmits?.[statusEmits.length - 1]?.[0] as StatusPayload | undefined;
        expect(lastStatus).toBeDefined();
        if (!lastStatus) throw new Error('Missing lastStatus');
        expect(lastStatus.type).toBe('success');
        expect(lastStatus.message).toContain('2 von 2 Dateien erfolgreich hochgeladen');
    });

    it('handles partial upload failure', async () => {
        commitFileMock.mockResolvedValueOnce({ commitId: 'c1' }).mockRejectedValueOnce(new Error('boom'));

        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('a.xml'), makeUploadInfo('b.xml')] });
        await wrapper.vm.$nextTick();

        const buttons = wrapper.findAll('button');
        expect(buttons.length).toBeGreaterThan(0);
        await buttons[0]?.trigger('click');

        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        expect(commitFileMock).toHaveBeenCalledTimes(2);

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('warning');
    });

    it('deletes existing file after confirmation', async () => {
        commitWorkspaceMock.mockResolvedValue({});

        const wrapper = mountIt({
            inputFiles: [{ name: 'old.xml', lastModified: new Date().toISOString(), size: 10, type: 'text/xml' }] as InputFile[],
            disabled: false,
        });

        await wrapper.vm.$nextTick();

        const existing = wrapper.find('.existing-files');
        expect(existing.exists()).toBe(true);

        const delButtons = existing.findAll('button');
        expect(delButtons.length).toBeGreaterThan(0);

        await delButtons[0]?.trigger('click');
        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        expect(commitWorkspaceMock).toHaveBeenCalledTimes(1);

        const emits = wrapper.emitted('update:input-files') ?? [];
        expect(emits.length).toBeGreaterThan(0);

        const payload = emits[emits.length - 1]?.[0] as InputFile[] | undefined;
        expect(payload).toBeDefined();
        if (!payload) throw new Error('Missing update:input-files payload');

        expect(payload.length).toBe(0);
    });

    it('beforeUpload returns true for valid file', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        const ok = makeUploadInfo('ok.xml', 10);
        upload.vm.$emit('before-upload', { file: ok, fileList: [ok] });

        await wrapper.vm.$nextTick();

        const emits = wrapper.emitted('update:status-message') ?? [];
        const hasError = emits.some((c: any[]) => c?.[0]?.type === 'error');
        expect(hasError).toBe(false);
    });

    it('beforeUpload rejects missing file', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        const bad = makeUploadInfoNoFile('x.xml');
        upload.vm.$emit('before-upload', { file: bad, fileList: [bad] });

        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('konnte nicht gelesen werden');
    });

    it('beforeUpload rejects oversized file', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        const over = makeUploadInfo('huge.json', 101 * 1024 * 1024);
        upload.vm.$emit('before-upload', { file: over, fileList: [over] });

        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('zu groß');
    });

    it('beforeUpload rejects invalid extension', async () => {
        const wrapper = mountIt();
        const upload = getUploadComponent(wrapper);

        const bad = makeUploadInfo('bad.exe', 10);
        upload.vm.$emit('before-upload', { file: bad, fileList: [bad] });

        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('kein gültiges Format');
    });

    it('branch falls back to feature/version on upload when branch is dev', async () => {
        commitFileMock.mockResolvedValue({ commitId: 'c1' });

        const wrapper = mountIt({ branch: 'dev', version: '1.0.0' });
        const upload = getUploadComponent(wrapper);

        upload.vm.$emit('change', { fileList: [makeUploadInfo('a.xml')] });
        await wrapper.vm.$nextTick();

        const buttons = wrapper.findAll('button');
        await buttons[0]?.trigger('click');

        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        expect(commitFileMock).toHaveBeenCalledTimes(1);
        const callArg = commitFileMock.mock.calls[0]?.[0];
        expect(callArg?.branch).toBe('feature/1.0.0');
    });

    it('branch falls back to feature/version on delete when branch is dev', async () => {
        commitWorkspaceMock.mockResolvedValue({});

        const wrapper = mountIt({
            branch: 'dev',
            version: '1.0.0',
            inputFiles: [{ name: 'old.xml', lastModified: new Date().toISOString(), size: 10, type: 'text/xml' }] as InputFile[],
            disabled: false,
        });

        await wrapper.vm.$nextTick();

        const existing = wrapper.find('.existing-files');
        const delButtons = existing.findAll('button');
        await delButtons[0]?.trigger('click');

        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        expect(commitWorkspaceMock).toHaveBeenCalledTimes(1);
        const callArg = commitWorkspaceMock.mock.calls[0]?.[0];
        expect(callArg?.branch).toBe('feature/1.0.0');
    });

    it('handleFileRemove re-validates and clears list on invalid remaining selection', async () => {
        const wrapper = mountIt({ disabled: false });
        const upload = getUploadComponent(wrapper);

        const zip = makeUploadInfo('a.zip');
        upload.vm.$emit('change', { fileList: [zip] });
        await wrapper.vm.$nextTick();

        const mixed = [makeUploadInfo('a.zip'), makeUploadInfo('b.xml')];
        upload.vm.$emit('remove', { file: mixed[0], fileList: mixed });

        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('error');
        expect(String(last.message)).toContain('nicht gleichzeitig ZIP');

        expect(wrapper.find('.upload-button').exists()).toBe(false);
    });

    it('uploadFiles early-returns warning when no files selected', async () => {
        const wrapper = mountIt();

        await (wrapper.vm as any).uploadFiles();
        await wrapper.vm.$nextTick();

        const last = getLastStatus(wrapper);
        expect(last.type).toBe('warning');
        expect(String(last.message)).toContain('Bitte wählen Sie Dateien aus');
    });

    it('deleteFile catch sets error status and shows message; finally resets loading', async () => {
        commitWorkspaceMock.mockRejectedValueOnce(new Error('boom'));

        const wrapper = mountIt({
            inputFiles: [{ name: 'old.xml', lastModified: new Date().toISOString(), size: 10, type: 'text/xml' }],
            disabled: false,
        });

        await wrapper.vm.$nextTick();

        const existing = wrapper.find('.existing-files');
        const delButton = existing.findAll('button')[0];

        await delButton?.trigger('click');
        await flush();
        await flush();
        await wrapper.vm.$nextTick();

        const statusEmits = wrapper.emitted('update:status-message');
        expect(statusEmits).toBeTruthy();

        // Finde die error message
        const errorStatus = statusEmits?.find(e => (e[0] as StatusPayload)?.type === 'error');
        expect(errorStatus).toBeTruthy();
        expect((errorStatus?.[0] as StatusPayload)?.message).toContain('Fehler beim Löschen');

        // Prüfe dass loading zurückgesetzt wurde
        expect(wrapper.vm.deletingIndex).toBeNull();
    });

});