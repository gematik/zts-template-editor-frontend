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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getUserInfo, sanitizeExternalUrl } from '../../api/userinfo'

let hrefValue = 'https://app.example.test/current'

function mockLocation(origin = 'https://app.example.test', pathname = '/current') {
  hrefValue = `${origin}${pathname}`
  Object.defineProperty(globalThis, 'location', {
    value: {
      origin,
      pathname,
      get href() { return hrefValue },
      set href(v: string) { hrefValue = String(v) },
    } as any,
    configurable: true,
  })
}

describe('getUserInfo backend', () => {
  let originalLocation: Location

  beforeEach(() => {
    vi.clearAllMocks()
    originalLocation = globalThis.location
    mockLocation()
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', { value: originalLocation, configurable: true })
    vi.restoreAllMocks()
  })

  it('ruft den Backend-Userinfo-Endpunkt same-origin auf', async () => {
    const mockUserInfo = {
      name: 'John Doe',
      email: 'john@example.com',
      groups: ['dev/reviewers'],
      is_reviewer: true,
      picture: 'https://gitlab.example.test/avatar.png',
      profile: 'https://gitlab.example.test/john',
    }

    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockUserInfo), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const result = await getUserInfo()

    expect(fetch).toHaveBeenCalledWith('https://app.example.test/auth/userinfo', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: expect.any(Headers),
      responseType: 'json',
    }))

    const firstCall = vi.mocked(fetch).mock.calls[0];

    expect(firstCall).toBeDefined();

    const headers = firstCall![1]?.headers as Headers;
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest')
    expect(headers.has('Content-Type')).toBe(false)
    expect(result).toEqual(mockUserInfo)
  })

  it('normalisiert minimale Backend-Userinfo-Daten defensiv', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ email: 'jane@example.com' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const result = await getUserInfo()

    expect(result).toEqual({
      email: 'jane@example.com',
      name: 'jane@example.com',
      profile: undefined,
      picture: undefined,
      groups: [],
      is_reviewer: false,
    })
  })

  it('übernimmt das Reviewer-Mapping aus dem Backend', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      name: 'Reviewer User',
      groups: ['dev/reviewers'],
      is_reviewer: true,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const result = await getUserInfo()

    expect(result.name).toBe('Reviewer User')
    expect(result.groups).toEqual(['dev/reviewers'])
    expect(result.is_reviewer).toBe(true)
  })

  it('entfernt relative oder kaputte Profil-URLs', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      name: 'Fabian',
      picture: 'N/A',
      profile: '/users/fabian',
      groups: ['dev/publishers', '', null],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const result = await getUserInfo()

    expect(result.name).toBe('Fabian')
    expect(result.picture).toBeUndefined()
    expect(result.profile).toBeUndefined()
    expect(result.groups).toEqual(['dev/publishers'])
  })

  it('leitet bei Backend-401 zum oauth2-proxy Login weiter', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 401, statusText: 'Unauthorized' }))

    await expect(getUserInfo()).rejects.toThrow(/Session expired/)

    const url = new URL(globalThis.location.href)
    expect(url.pathname).toBe('/oauth2/start')
    expect(url.searchParams.get('rd')).toBe('https://app.example.test/')
  })

  it('sanitizeExternalUrl akzeptiert nur absolute http(s)-URLs', () => {
    expect(sanitizeExternalUrl('https://example.test/a.png')).toBe('https://example.test/a.png')
    expect(sanitizeExternalUrl('http://example.test/a.png')).toBe('http://example.test/a.png')
    expect(sanitizeExternalUrl('N/A')).toBeUndefined()
    expect(sanitizeExternalUrl('/avatar.png')).toBeUndefined()
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined()
  })
})
