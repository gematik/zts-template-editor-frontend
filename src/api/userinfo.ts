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

import type { UserInfo } from '../types';
import { logger } from '../utils/logger';
import { api } from './http';

const userInfoLogger = logger.scope('api/userinfo');

/**
 * User information is provided by the backend because the reviewer mapping is
 * application-specific and must not be derived from oauth2-proxy userinfo.
 * oauth2-proxy is only used to check whether a browser session exists.
 */
type BackendUserInfo = Partial<UserInfo>;

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isString);
}

export function sanitizeExternalUrl(value: unknown): string | undefined {
  if (!isString(value)) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function getUserInfo(): Promise<UserInfo> {
  userInfoLogger.debug('Loading user information from backend.', { path: '/auth/userinfo' });

  const data = await api<BackendUserInfo>('/auth/userinfo', {
    method: 'GET',
    responseType: 'json',
  });

  const name = data.name ?? data.nickname ?? data.email ?? '';

  return {
    ...data,
    name,
    profile: sanitizeExternalUrl(data.profile),
    picture: sanitizeExternalUrl(data.picture),
    groups: asStringArray(data.groups),
    is_reviewer: data.is_reviewer ?? false,
  };
}
