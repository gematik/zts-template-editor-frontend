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
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ChangelogJson from '../../components/ChangelogJson.vue';

describe('ChangelogJson.vue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert Package-Felder und initiale Daten aus modelValue', () => {
    const initial = JSON.stringify({
      'package-name': 'my-package',
      'package-version': '1.2.3',
      changes: [{ type: 'bugfix', description: 'Fixed something' }],
    });

    const wrapper = mount(ChangelogJson, {
      props: { modelValue: initial, canEdit: true },
    });

    const nameInput = wrapper.find('#packageName_changelogs');
    const versionInput = wrapper.find('#packageVersion_changelogs');

    expect(nameInput.exists()).toBe(true);
    expect(versionInput.exists()).toBe(true);

    const nameEl = nameInput.element as HTMLInputElement;
    const versionEl = versionInput.element as HTMLInputElement;

    expect(nameEl.value).toBe('my-package');
    expect(versionEl.value).toBe('1.2.3');

    expect(wrapper.text()).toContain('"package-name": "my-package"');
    expect(wrapper.text()).toContain('"package-version": "1.2.3"');
  });

  it('emittiert update:modelValue wenn ein Change geändert wird', async () => {
    const initial = JSON.stringify({
      'package-name': 'pkg',
      'package-version': '0.1.0',
      changes: [{ type: 'bugfix', description: 'old desc' }],
    });

    const wrapper = mount(ChangelogJson, {
      props: { modelValue: initial, canEdit: true },
    });

    const desc = wrapper.find('#changes0');
    expect(desc.exists()).toBe(true);

    await desc.setValue('new description');
    await nextTick();

    const emits = wrapper.emitted('update:modelValue');
    expect(emits).toBeTruthy();
    if (!emits || emits.length === 0) {
        throw new Error('update:modelValue wurde nicht emittiert');
    }

    const last = emits[emits.length - 1] as unknown[];
    const payload = last[0] as string   ;           

    const parsed = JSON.parse(payload)  as {
      changes: { type: string;  description: string }[];
    };

    expect(parsed.changes.length).toBeGreaterThan(0);
    expect(parsed.changes?.[0]?.description).toBe('new description');
    expect(parsed.changes?.[0]?.type).toBe('bugfix');
  });

  it('fügt mit addChange einen Eintrag hinzu', async () => {
    const wrapper = mount(ChangelogJson, {
      props: {
        modelValue: JSON.stringify({
          'package-name': 'pkg',
          'package-version': '0.1.0',
          changes: [],
        }),
        canEdit: true,
      },
    });

    expect(wrapper.findAll('select').length).toBe(0);

    const addButton = wrapper.find('button');
    expect(addButton.exists()).toBe(true);

    await addButton.trigger('click');
    await nextTick();

    const selects = wrapper.findAll('select');
    expect(selects.length).toBe(1);

    const emits = wrapper.emitted('update:modelValue');
    expect(emits).toBeTruthy();
    if (!emits || emits.length === 0) {
        throw new Error('update:modelValue wurde nicht emittiert');
    }

    const last = emits[emits.length - 1] as unknown[];
    const payload = last[0] as string;

    const parsed = JSON.parse(payload) as {
      changes: { type: string; description: string }[];
    };

    expect(parsed.changes.length).toBe(1);
    expect(parsed?.changes[0]?.type).toBe('bugfix');
    expect(parsed?.changes[0]?.description).toBe('');
  });

  it('entfernt mit removeChange einen Eintrag', async () => {
    const initial = JSON.stringify({
      'package-name': 'pkg',
      'package-version': '0.1.0',
      changes: [
        { type: 'bugfix', description: '1' },
        { type: 'feature', description: '2' },
      ],
    });

    const wrapper = mount(ChangelogJson, {
      props: { modelValue: initial, canEdit: true },
    });

    expect(wrapper.findAll('select').length).toBe(2);

    const allButtons = wrapper.findAll('button');
    const removeButtons = allButtons.filter(b => b.text() === '✕');
    expect(removeButtons.length).toBe(2);

    const firstRemove = removeButtons[0];
    await firstRemove?.trigger('click');
    await nextTick();

    expect(wrapper.findAll('select').length).toBe(1);

    const emits = wrapper.emitted('update:modelValue');
    expect(emits).toBeTruthy();
    if (!emits || emits.length === 0) {
        throw new Error('update:modelValue wurde nicht emittiert');
    }

    const last = emits[emits.length - 1] as unknown[];
    const payload = last[0] as string;

    const parsed = JSON.parse(payload) as {
      changes: { type: string; description: string }[];
    };

    expect(parsed.changes.length).toBe(1);
    expect(parsed.changes[0]?.description).toBe('2');
  });

  it('reagiert auf externes Update von modelValue', async () => {
    const wrapper = mount(ChangelogJson, {
      props: {
        modelValue: JSON.stringify({
          'package-name': 'pkg',
          'package-version': '0.1.0',
          changes: [],
        }),
        canEdit: true,
      },
    });

    await wrapper.setProps({
      modelValue: JSON.stringify({
        'package-name': 'other-pkg',
        'package-version': '2.0.0',
        changes: [{ type: 'improvement', description: 'improved' }],
      }),
    });
    await nextTick();

    const nameInput = wrapper.find('#packageName_changelogs');
    const versionInput = wrapper.find('#packageVersion_changelogs');

    const nameEl = nameInput.element as HTMLInputElement;
    const versionEl = versionInput.element as HTMLInputElement;

    expect(nameEl.value).toBe('other-pkg');
    expect(versionEl.value).toBe('2.0.0');

    const selects = wrapper.findAll('select');
    expect(selects.length).toBe(1);

    const firstSelect = selects[0];
    const selectEl = firstSelect?.element as HTMLSelectElement;
    expect(selectEl.value).toBe('improvement');
  });

  it('deaktiviert Felder wenn canEdit=false', () => {
    const initial = JSON.stringify({
      'package-name': 'pkg',
      'package-version': '0.1.0',
      changes: [{ type: 'feature', description: 'x' }],
    });

    const wrapper = mount(ChangelogJson, {
      props: { modelValue: initial, canEdit: false },
    });

    const select = wrapper.find('select');
    const desc = wrapper.find('#changes0');

    const selectEl = select.element as HTMLSelectElement;
    const descEl = desc.element as HTMLInputElement;

    expect(selectEl.disabled).toBe(true);
    expect(descEl.disabled).toBe(true);

    const nameEl = wrapper.find('#packageName_changelogs').element as HTMLInputElement;
    const versionEl = wrapper.find('#packageVersion_changelogs').element as HTMLInputElement;

    expect(nameEl.disabled).toBe(true);
    expect(versionEl.disabled).toBe(true);
  });
});
