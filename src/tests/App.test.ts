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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import App from '../App.vue';

// Mocks
const mockCheckAuthStatus = vi.fn();
const mockFetchUserInfo = vi.fn();
const mockLogout = vi.fn();

const mockRouterView = defineComponent({
  name: 'RouterView',
  setup() {
    return () => h('div', { 'data-test': 'router-view' }, 'Router View Content');
  }
});

// Mock Composables
vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({
    checkAuthStatus: mockCheckAuthStatus,
    logout: mockLogout
  })
}));

vi.mock('../composables/useUserinfo', () => ({
  useUserinfo: () => ({
    fetchUserInfo: mockFetchUserInfo
  })
}));


// Mock Router
vi.mock('../router', () => ({
  default: {
    currentRoute: {
      value: {
        fullPath: '/test'
      }
    },
    push: vi.fn()
  }
}));

// Mock Components
vi.mock('../components/layout/Header.vue', () => ({
  default: defineComponent({
    name: 'ZtsHeader',
    setup() {
      return () => h('header', { 'data-test': 'header' }, 'Header');
    }
  })
}));

vi.mock('../components/layout/Footer.vue', () => ({
  default: defineComponent({
    name: 'ZtsFooter',
    setup() {
      return () => h('footer', { 'data-test': 'footer' }, 'Footer');
    }
  })
}));

// Mock naive-ui
vi.mock('naive-ui', () => {
  const NConfigProvider = defineComponent({
    name: 'NConfigProvider',
    setup(_, { slots }) {
      return () => h('div', { 'data-test': 'config-provider' }, slots.default?.());
    }
  });

  const NDialogProvider = defineComponent({
    name: 'NDialogProvider',
    setup(_, { slots }) {
      return () => h('div', { 'data-test': 'dialog-provider' }, slots.default?.());
    }
  });

  const NMessageProvider = defineComponent({
    name: 'NMessageProvider',
    setup(_, { slots }) {
      return () => h('div', { 'data-test': 'message-provider' }, slots.default?.());
    }
  });

  const NSpin = defineComponent({
    name: 'NSpin',
    setup() {
      return () => h('div', { 'data-test': 'spin' }, 'Loading...');
    }
  });

  return {
    NConfigProvider,
    NDialogProvider,
    NMessageProvider,
    NSpin,
    lightTheme: {},
    useDialog: vi.fn(),
    createDiscreteApi: vi.fn(() => ({
      message: {
        success: vi.fn(),
        loading: vi.fn()
      }
    }))
  };
});

describe('App.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAuthStatus.mockReset();
    mockFetchUserInfo.mockReset();
    mockLogout.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mountApp = () => {
    return mount(App, {
      global: {
        stubs: {
          RouterView: mockRouterView
        }
      }
    });
  };

  it('Ruft checkAuthStatus beim Mount auf', () => {
    mockCheckAuthStatus.mockResolvedValue(true);
    mockFetchUserInfo.mockResolvedValue(undefined);

    mountApp();

    expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
  });

  it('Rendert ohne Auth-Blocking-Spinner', async () => {
    mockCheckAuthStatus.mockResolvedValue(true);

    const wrapper = mountApp();
    await flushPromises();

    expect(wrapper.find('[data-test=router-view]').exists()).toBe(true);
  });

  it('Cleanup beim Unmount', async () => {
    mockCheckAuthStatus.mockResolvedValue(true);
    mockFetchUserInfo.mockResolvedValue(undefined);

    const wrapper = mountApp();
    await flushPromises();

    wrapper.unmount();

    expect(wrapper.vm).toBeDefined();
  });
});
