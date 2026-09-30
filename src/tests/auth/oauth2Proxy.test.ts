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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkOAuth2ProxySession,
  clearAuthState,
  currentUrl,
  isAuthenticated,
  isUnauthorized,
  markAuthenticated,
  oauth2ProxyAuthUrl,
  oauth2ProxySignOutUrl,
  oauth2ProxyStartUrl,
} from '../../auth/oauth2Proxy'

function mockLocation(origin = 'https://app.example.test', href = 'https://app.example.test/projects') {
  Object.defineProperty(globalThis, 'location', {
    value: { origin, href } as any,
    configurable: true,
  })
}

describe('oauth2Proxy helpers', () => {
  let originalLocation: Location

  beforeEach(() => {
    originalLocation = globalThis.location
    mockLocation()
    globalThis.fetch = vi.fn()
    isAuthenticated.value = false
    isUnauthorized.value = false
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', { value: originalLocation, configurable: true })
    vi.restoreAllMocks()
  })

  it('baut oauth2-proxy URLs same-origin', () => {
    expect(oauth2ProxyAuthUrl()).toBe('https://app.example.test/oauth2/auth')
    expect(currentUrl()).toBe('https://app.example.test/projects')

    const loginUrl = new URL(oauth2ProxyStartUrl('https://app.example.test/projects'))
    expect(loginUrl.pathname).toBe('/oauth2/start')
    expect(loginUrl.searchParams.get('rd')).toBe('https://app.example.test/projects')

    const logoutUrl = new URL(oauth2ProxySignOutUrl('https://app.example.test/'))
    expect(logoutUrl.pathname).toBe('/oauth2/sign_out')
    expect(logoutUrl.searchParams.get('rd')).toBe('https://app.example.test/')
  })

  it('nutzt aktuelle URL als Default-Rücksprungziel beim Login', () => {
    const loginUrl = new URL(oauth2ProxyStartUrl())
    expect(loginUrl.searchParams.get('rd')).toBe('https://app.example.test/projects')
  })

  it('normalisiert relative Rücksprungziele auf same-origin', () => {
    const loginUrl = new URL(oauth2ProxyStartUrl('/projects?tab=open'))
    expect(loginUrl.searchParams.get('rd')).toBe('https://app.example.test/projects?tab=open')
  })

  it('ersetzt externe Rücksprungziele durch Root', () => {
    const loginUrl = new URL(oauth2ProxyStartUrl('https://evil.example.test/phishing'))
    expect(loginUrl.searchParams.get('rd')).toBe('https://app.example.test/')
  })

  it('nutzt Root als Default-Rücksprungziel beim Logout', () => {
    const logoutUrl = new URL(oauth2ProxySignOutUrl())
    expect(logoutUrl.searchParams.get('rd')).toBe('https://app.example.test/')
  })

  it('setzt und löscht lokalen Auth-Zustand', () => {
    isUnauthorized.value = true

    markAuthenticated()

    expect(isAuthenticated.value).toBe(true)
    expect(isUnauthorized.value).toBe(false)

    isUnauthorized.value = true

    clearAuthState()

    expect(isAuthenticated.value).toBe(false)
    expect(isUnauthorized.value).toBe(false)
  })

  it.each([200, 202])('checkOAuth2ProxySession liefert true bei %i', async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status }))

    await expect(checkOAuth2ProxySession()).resolves.toBe(true)

    expect(fetch).toHaveBeenCalledWith('https://app.example.test/oauth2/auth', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
      headers: expect.objectContaining({
        Accept: 'text/plain',
        'X-Requested-With': 'XMLHttpRequest',
      }),
    }))
  })

  it.each([401, 403, 500])('checkOAuth2ProxySession liefert false bei %i', async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status }))

    await expect(checkOAuth2ProxySession()).resolves.toBe(false)
  })
})
