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
import { ref, nextTick, type Ref, defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useStatusMessage } from '../../composables/useStatusMessage';
import type { StatusMessageState } from '../../types';

// Helper to mount composable within a component setup to avoid onUnmounted warnings
function mountUseStatusMessage(statusRef: Ref<StatusMessageState>) {
    let api: ReturnType<typeof useStatusMessage> | null = null;
    const Harness = defineComponent({
        setup() {
            api = useStatusMessage(statusRef);
            return () => h('div');
        }
    });
    const wrapper = mount(Harness);
    if (!api) throw new Error('Composable did not initialize');
    return { api: api as ReturnType<typeof useStatusMessage>, wrapper };
}

describe('Test: Composable useStatusMessage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('Test: initial kein Timer bei null-Nachricht', async () => {
        const statusRef = ref<StatusMessageState>({ type: null, message: null });
        mountUseStatusMessage(statusRef);

        await nextTick();

        vi.advanceTimersByTime(6000);
        expect(statusRef.value).toEqual({ type: null, message: null });
    });

    it('Test: plant Reset bei nicht-Fehler Status', async () => {
        const statusRef = ref<StatusMessageState>({ type: null, message: null });
        const { api } = mountUseStatusMessage(statusRef);
        const { setStatus } = api;

        setStatus('success', 'Gespeichert!');
        await nextTick();

        expect(statusRef.value).toEqual({ type: 'success', message: 'Gespeichert!' });

        vi.advanceTimersByTime(5000);
        expect(statusRef.value).toEqual({ type: null, message: null });
    });

    it('Test: kein Reset-Timer bei Fehler', async () => {
        const statusRef = ref<StatusMessageState>({ type: null, message: null });
        const { api } = mountUseStatusMessage(statusRef);
        const { setStatus } = api;

        setStatus('error', 'Fehlgeschlagen!');
        await nextTick();

        vi.advanceTimersByTime(10000);
        expect(statusRef.value).toEqual({ type: 'error', message: 'Fehlgeschlagen!' });
    });

    it('Test: neuer Timer löscht vorherigen Timer', async () => {
        const statusRef = ref<StatusMessageState>({ type: null, message: null });
        const { api } = mountUseStatusMessage(statusRef);
        const { setStatus } = api;

        setStatus('info', 'Erste');
        await nextTick();

        vi.advanceTimersByTime(2000);
        expect(statusRef.value).toEqual({ type: 'info', message: 'Erste' });

        setStatus('success', 'Zweite');
        await nextTick();

        vi.advanceTimersByTime(2000);
        expect(statusRef.value).toEqual({ type: 'success', message: 'Zweite' });

        vi.advanceTimersByTime(3000);
        expect(statusRef.value).toEqual({ type: null, message: null });
    });

    it('Test: setStatus aktualisiert Referenz sofort', async () => {
        const statusRef = ref<StatusMessageState>({ type: null, message: null });
        const { api } = mountUseStatusMessage(statusRef);
        const { setStatus } = api;

        setStatus('info', 'Hallo');
        await nextTick();

        expect(statusRef.value).toEqual({ type: 'info', message: 'Hallo' });
    });
});
