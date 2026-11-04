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

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PipelineStatus from '../../components/PipelineStatus.vue';
import type { PipelineRef } from '../../types';
import { fmtDate } from '../../utils/utils';

vi.mock('@vicons/fluent', () => {
  const icon = (name: string) => ({
    template: `<i data-icon="${name}"></i>`,
  });

  return {
    CheckmarkCircle24Filled: icon('success'),
    Clock24Regular: icon('running'),
    DismissCircle24Filled: icon('failed'),
    PauseCircle24Regular: icon('pending'),
    ErrorCircle24Filled: icon('other'),
  };
});

const NIconStub = {
  props: ['size', 'color'],
  template: '<span data-test="icon" :data-color="color"><slot /></span>',
};

function createPipeline(overrides: Partial<PipelineRef> = {}): PipelineRef {
  return {
    id: 42,
    status: 'success',
    webUrl: 'http://pipeline-url',
    updatedAt: '2024-01-01T00:00:00Z',
    finishedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function render(pipeline?: PipelineRef | null) {
  return mount(PipelineStatus, {
    props: { pipeline },
    global: {
      components: { NIcon: NIconStub },
      stubs: { NIcon: NIconStub },
    },
  });
}

describe('PipelineStatus', () => {
  it('rendert bei vorhandener URL einen Link in einen neuen Tab', () => {
    const webUrl = 'https://gitlab.example.com/group/project/-/pipelines/42';
    const wrapper = render(createPipeline({ webUrl }));

    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.attributes('href')).toBe(webUrl);
    expect(wrapper.attributes('target')).toBe('_blank');
    expect(wrapper.attributes('rel')).toBe('noopener noreferrer');
    expect(wrapper.attributes('role')).toBeUndefined();
  });

  it('rendert ohne URL ein Icon ohne Linkattribute', () => {
    const wrapper = render(createPipeline({ webUrl: undefined }));

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('href')).toBeUndefined();
    expect(wrapper.attributes('target')).toBeUndefined();
    expect(wrapper.attributes('rel')).toBeUndefined();
  });

  it('priorisiert finishedAt Zeitangabe', () => {
    const pipeline = createPipeline();
    const wrapper = render(pipeline);
    const expected = [
      'Pipeline: Success',
      `Beendet: ${fmtDate(pipeline.finishedAt!)}`,
    ].join('\n');

    expect(wrapper.attributes('title')).toBe(expected);
    expect(wrapper.attributes('aria-label')).toBe(expected);
  });

  it('zeigt updatedAt, wenn finishedAt null ist', () => {
    const pipeline = createPipeline({
      status: 'running',
      finishedAt: null,
    });
    const wrapper = render(pipeline);
    const expected = [
      'Pipeline: Running',
      `Letzte Änderung: ${fmtDate(pipeline.updatedAt)}`,
    ].join('\n');

    expect(wrapper.attributes('title')).toBe(expected);
    expect(wrapper.attributes('aria-label')).toBe(expected);
  });

  it.each([null, undefined])(
    'liefert Pending wenn Pipeline null',
    (pipeline) => {
      const wrapper = render(pipeline);

      expect(wrapper.element.tagName).toBe('SPAN');
      expect(wrapper.attributes('title')).toBe('Pipeline: Pending');
      expect(wrapper.attributes('aria-label')).toBe('Pipeline: Pending');
      expect(wrapper.get('[data-icon]').attributes('data-icon')).toBe('pending');
    }
  );

  it.each([
    { status: 'success', icon: 'success', color: '#108548' },
    { status: 'running', icon: 'running', color: '#1F75CB' },
    { status: 'failed', icon: 'failed', color: '#dd2b0e' },
    { status: 'pending', icon: 'pending', color: '#4a4d4d' },
    { status: 'warning', icon: 'other', color: '#D99530' },
    { status: 'unknown', icon: 'other', color: '#D99530' },
  ])('zeigt für $status das passende Icon und die Farbe', ({
    status,
    icon,
    color,
  }) => {
    const wrapper = render(createPipeline({ status }));

    expect(wrapper.get('[data-icon]').attributes('data-icon')).toBe(icon);
    expect(wrapper.get('[data-test="icon"]').attributes('data-color')).toBe(color);
  });
});