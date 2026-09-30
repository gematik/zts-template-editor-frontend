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

import { vi } from 'vitest';
import * as vue from 'vue';

vi.mock('naive-ui', () => {
  const { defineComponent, h } = vue;

  const BasicStub = defineComponent({
    name: 'BasicStub',
    setup(_, { slots, attrs }) {
      return () => h('div', { ...attrs }, slots.default?.());
    },
  });

  const NButton = defineComponent({
    name: 'NButton',
    props: {
      disabled: Boolean,
      loading: Boolean,
      type: String,
      size: String,
      attrType: String,
      color: String,
      circle: Boolean,
      quaternary: Boolean,
    },
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

  const NAlert = defineComponent({
    name: 'NAlert',
    props: {
      type: String,
      title: String,
      showIcon: Boolean,
      closable: Boolean,
    },
    emits: ['close'],
    setup(props, { emit, slots, attrs }) {
      return () =>
        h('nalert', { role: 'alert', ...attrs, type: props.type, title: props.title }, [
          props.title ? h('strong', props.title) : null,
          slots.default?.(),
          props.closable ? h('button', { 'data-test': 'alert-close', onClick: () => emit('close') }, 'x') : null,
        ]);
    },
  });

  const NUpload = defineComponent({
    name: 'NUpload',
    props: {
      fileList: { type: Array, default: () => [] },
      disabled: Boolean,
      multiple: Boolean,
      directoryDnd: Boolean,
      action: null as any,
      max: Number,
      defaultUpload: Boolean,
    },
    emits: ['change', 'remove', 'before-upload'],
    setup(props, { emit, slots, attrs, expose }) {
      const emitChange = (fileList: any[]) => emit('change', { fileList });
      const emitRemove = (file: any, fileList: any[]) => emit('remove', { file, fileList });
      const emitBeforeUpload = (file: any, fileList: any[]) => emit('before-upload', { file, fileList });

      expose({ emitChange, emitRemove, emitBeforeUpload });

      return () =>
        h(
          'div',
          { ...attrs, 'data-stub': 'n-upload', 'data-disabled': props.disabled ? '1' : '0' },
          slots.default?.()
        );
    },
  });

  const NUploadDragger = defineComponent({
    name: 'NUploadDragger',
    setup(_, { slots, attrs }) {
      return () => h('div', { ...attrs, 'data-stub': 'n-upload-dragger' }, slots.default?.());
    },
  });

  const NCollapseTransition = defineComponent({
    name: 'NCollapseTransition',
    props: {
      show: { type: Boolean, default: true },
    },
    setup(props, { slots, attrs }) {
      return () => (props.show ? h('div', { ...attrs }, slots.default?.()) : null);
    },
  });

  const NTooltip = defineComponent({
    name: 'NTooltip',
    setup(_, { slots, attrs }) {
      return () => h('div', { ...attrs, 'data-stub': 'n-tooltip' }, slots.trigger?.() ?? slots.default?.());
    },
  });

  const messageApi = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const dialogApi = {
    warning: vi.fn((opts: any) => {
      if (opts?.onPositiveClick) return opts.onPositiveClick();
    }),
  };

  return {
    NButton,
    NSpin: BasicStub,
    NAlert,
    NCheckbox: BasicStub,
    NCard: BasicStub,
    NTabs: BasicStub,
    NTabPane: BasicStub,
    NSpace: BasicStub,
    NCollapse: BasicStub,
    NCollapseItem: BasicStub,
    NCollapseTransition,
    NTooltip,

    NUpload,
    NUploadDragger,
    NList: BasicStub,
    NListItem: BasicStub,
    NIcon: BasicStub,
    NTag: BasicStub,
    NText: BasicStub,
    NP: BasicStub,

    useThemeVars: () => ({}),
    useConfig: () => ({}),
    useStyle: () => { },

    useMessage: () => messageApi,
    useDialog: () => dialogApi,
  };
});

vi.mock('@vicons/fluent', () => {
  const { defineComponent, h } = vue;
  const IconStub = defineComponent({ name: 'IconStub', setup: () => () => h('i') });

  return {
    Archive48Regular: IconStub,
    Document48Regular: IconStub,
    Delete24Regular: IconStub,
  };
});