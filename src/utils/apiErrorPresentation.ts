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

import { ApiError } from '../api/http';

export type ApiErrorDisplay = {
  title: string;
  message: string;
  debug: string | null;
};

export type StatusMessageType = 'success' | 'error' | 'info' | 'warning' | null;

export type StatusMessageState = {
  type: StatusMessageType;
  title?: string | null;
  message: string | null;
  debug?: string | null;
};

type BackendFieldError = {
  field?: string;
  message?: string;
};

type BackendErrorPayload = {
  code?: string;
  message?: string;
  details?: BackendFieldError[];
};

const DEFAULT_ERROR_TITLE = 'Fehler';
const DEFAULT_ERROR_MESSAGE = 'Ein unerwarteter Fehler ist aufgetreten.';
const DEFAULT_SUCCESS_TITLE = 'Erfolg';
const DEFAULT_INFO_TITLE = 'Hinweis';
const DEFAULT_WARNING_TITLE = 'Warnung';

/**
 * Escapes HTML special characters for safe rendering.
 */
function escapeHtml(value: string): string {
  // NOSONAR -- replaceAll is not available for the current TypeScript target/lib
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses the backend ApiError JSON body.
 */
export function parseBackendApiError(raw: string): BackendErrorPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const rawDetails = record.details;

    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
      details: Array.isArray(rawDetails)
        ? rawDetails.filter(
          (item: unknown): item is BackendFieldError =>
            !!item && typeof item === 'object' && !Array.isArray(item),
        )
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a compact debug string from technical error data.
 */
function buildDebugMessage(
  status?: number,
  code?: string,
  details?: BackendFieldError[],
): string | null {
  const parts: string[] = [];

  if (status) {
    parts.push(String(status));
  }

  if (code) {
    parts.push(code);
  }

  if (Array.isArray(details) && details.length > 0) {
    const fieldMessages = details
      .map((detail) => {
        const field = typeof detail.field === 'string' ? detail.field.trim() : '';
        const message = typeof detail.message === 'string' ? detail.message.trim() : '';

        if (field && message) {
          return `${field}: ${message}`;
        }

        if (message) {
          return message;
        }

        return null;
      })
      .filter((value): value is string => !!value);

    if (fieldMessages.length > 0) {
      parts.push(fieldMessages.join(', '));
    }
  }

  return parts.length > 0 ? `(${parts.join(' - ')})` : null;
}

/**
 * Extracts normalized error parts from supported error shapes.
 * The backend response body is the primary source of truth.
 */
function extractApiErrorParts(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
  details?: BackendFieldError[];
} {
  if (error instanceof ApiError) {
    const payload = parseBackendApiError(error.body);

    return {
      status: error.status,
      code: payload?.code,
      message: payload?.message,
      details: payload?.details,
    };
  }

  const err = error as {
    status?: number;
    code?: string;
    message?: string;
    data?: { message?: string };
    response?: {
      status?: number;
      data?: {
        code?: string;
        message?: string;
        details?: BackendFieldError[];
      };
    };
  };

  const response = err?.response;
  const responseData = response?.data;

  return {
    status: err?.status ?? response?.status,
    code: responseData?.code ?? err?.code,
    message: responseData?.message ?? err?.data?.message ?? err?.message,
    details: Array.isArray(responseData?.details) ? responseData.details : undefined,
  };
}

/**
 * Returns the user-facing error message.
 */
export function getErrorDisplayMessage(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): string {
  if (error instanceof ApiError) {
    const payload = parseBackendApiError(error.body);

    if (payload?.message) {
      return payload.message;
    }

    if (error.body) {
      return error.body;
    }

    return fallbackMessage;
  }

  const err = error as {
    message?: string;
    response?: { data?: { message?: string } };
  };

  const responseData = err?.response?.data;

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message;
  }

  return fallbackMessage;
}

/**
 * Renders a plain escaped HTML message.
 */
export function renderStatusMessageHtml(message: string): string {
  return escapeHtml(String(message ?? ''));
}

/**
 * Converts an unknown error into a UI-friendly error object.
 */
export function formatApiError(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): ApiErrorDisplay {
  const { status, code, message, details } = extractApiErrorParts(error);

  return {
    title: DEFAULT_ERROR_TITLE,
    message: message || fallbackMessage,
    debug: buildDebugMessage(status, code, details),
  };
}

/**
 * Backward-compatible alias for formatting backend errors.
 */
export function formatBackendApiError(
  error: unknown,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
): ApiErrorDisplay {
  return formatApiError(error, fallbackMessage);
}

/**
 * Converts an unknown error into a standard UI status message.
 */
export function toErrorStatusMessage(
  error: unknown,
  fallbackMessage?: string,
): StatusMessageState {
  const formatted = formatApiError(error, fallbackMessage);

  return {
    type: 'error',
    title: formatted.title,
    message: formatted.message,
    debug: formatted.debug,
  };
}

/**
 * Creates a success status message.
 */
export function toSuccessStatusMessage(
  message: string,
  title = DEFAULT_SUCCESS_TITLE,
): StatusMessageState {
  return {
    type: 'success',
    title,
    message,
    debug: null,
  };
}

/**
 * Creates an informational status message.
 */
export function toInfoStatusMessage(
  message: string,
  title = DEFAULT_INFO_TITLE,
  debug: string | null = null,
): StatusMessageState {
  return {
    type: 'info',
    title,
    message,
    debug,
  };
}

/**
 * Creates a warning status message.
 */
export function toWarningStatusMessage(
  message: string,
  title = DEFAULT_WARNING_TITLE,
  debug: string | null = null,
): StatusMessageState {
  return {
    type: 'warning',
    title,
    message,
    debug,
  };
}
