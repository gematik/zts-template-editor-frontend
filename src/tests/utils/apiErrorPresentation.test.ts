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

import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/http';
import {
  formatApiError,
  formatBackendApiError,
  getErrorDisplayMessage,
  parseBackendApiError,
  renderStatusMessageHtml,
  toErrorStatusMessage,
  toInfoStatusMessage,
  toSuccessStatusMessage,
  toWarningStatusMessage,
} from '../../utils/apiErrorPresentation';

describe('apiErrorPresentation', () => {
  describe('parseBackendApiError', () => {
    it('parst gültiges Backend-Fehler-JSON', () => {
      expect(
        parseBackendApiError(
          JSON.stringify({
            code: 'VALIDATION_FAILED',
            message: 'Ein oder mehrere Eingabewerte sind ungültig.',
            details: [{ field: 'name', message: 'darf nicht leer sein' }],
          }),
        ),
      ).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Ein oder mehrere Eingabewerte sind ungültig.',
        details: [{ field: 'name', message: 'darf nicht leer sein' }],
      });
    });

    it('gibt null bei ungültigem JSON zurück', () => {
      expect(parseBackendApiError('{invalid-json')).toBeNull();
    });

    it('gibt null zurück wenn JSON kein Objekt ist', () => {
      expect(parseBackendApiError('"string"')).toBeNull();
      expect(parseBackendApiError('123')).toBeNull();
      expect(parseBackendApiError('true')).toBeNull();
      expect(parseBackendApiError('null')).toBeNull();
      expect(parseBackendApiError('[]')).toBeNull();
    });

    it('ignoriert code/message/details mit falschem Typ', () => {
      expect(
        parseBackendApiError(
          JSON.stringify({
            code: 123,
            message: false,
            details: 'not-an-array',
          }),
        ),
      ).toEqual({
        code: undefined,
        message: undefined,
        details: undefined,
      });
    });

    it('filtert ungültige detail-Einträge aus dem Array', () => {
      expect(
        parseBackendApiError(
          JSON.stringify({
            code: 'BAD_REQUEST',
            message: 'Ungültig',
            details: [
              { field: 'name', message: 'Pflichtfeld' },
              null,
              'bad-entry',
              123,
              { message: 'Nur Nachricht' },
            ],
          }),
        ),
      ).toEqual({
        code: 'BAD_REQUEST',
        message: 'Ungültig',
        details: [
          { field: 'name', message: 'Pflichtfeld' },
          { message: 'Nur Nachricht' },
        ],
      });
    });
  });

  describe('getErrorDisplayMessage', () => {
    it('liest bei ApiError die message aus dem Backend-Body', () => {
      const err = new ApiError(
        400,
        'Bad Request',
        JSON.stringify({
          code: 'BAD_REQUEST',
          message: 'Die Anfrage ist ungültig.',
          details: [],
        }),
      );

      expect(getErrorDisplayMessage(err, 'Fallback')).toBe('Die Anfrage ist ungültig.');
    });

    it('fällt bei ApiError mit unstrukturiertem Body auf den Body zurück', () => {
      const err = new ApiError(500, 'Server Error', 'Plain backend failure');

      expect(getErrorDisplayMessage(err, 'Fallback')).toBe('Plain backend failure');
    });

    it('nutzt bei leerem ApiError-Body den Fallback', () => {
      const err = new ApiError(500, 'Server Error', '');

      expect(getErrorDisplayMessage(err, 'Fallback')).toBe('Fallback');
    });

    it('liest response.data.message aus response-data Fehlern', () => {
      const err = {
        response: {
          status: 401,
          data: {
            code: 'UNAUTHORIZED',
            message: 'Nicht autorisiert',
          },
        },
      };

      expect(getErrorDisplayMessage(err, 'Fallback')).toBe('Nicht autorisiert');
    });

    it('ignoriert leere response.data.message und nutzt Error.message', () => {
      const err = Object.assign(new Error('Network failed'), {
        response: {
          status: 500,
          data: {
            message: '   ',
          },
        },
      });

      expect(getErrorDisplayMessage(err, 'Fallback')).toBe('Network failed');
    });

    it('nutzt err.message bei plain objects', () => {
      expect(getErrorDisplayMessage({ message: 'Nur Nachricht' }, 'Fallback')).toBe(
        'Nur Nachricht',
      );
    });

    it('ignoriert whitespace-only err.message und nutzt den Fallback', () => {
      expect(getErrorDisplayMessage({ message: '   ' }, 'Fallback')).toBe('Fallback');
    });

    it('nutzt den Fallback bei unbekanntem Fehlerobjekt', () => {
      expect(getErrorDisplayMessage({ foo: 'bar' }, 'Fallback')).toBe('Fallback');
    });
  });

  describe('renderStatusMessageHtml', () => {
    it('escaped HTML zuverlässig', () => {
      expect(renderStatusMessageHtml('<body> & "quoted"')).toBe(
        '&lt;body&gt; &amp; &quot;quoted&quot;',
      );
    });

    it('escaped auch Apostrophe', () => {
      expect(renderStatusMessageHtml(`O'Reilly`)).toBe('O&#39;Reilly');
    });

    it('wandelt null-artige Eingaben robust in String um', () => {
      expect(renderStatusMessageHtml(null as unknown as string)).toBe('');
    });
  });

  describe('formatApiError', () => {
    it('formatiert ApiError mit generischem Titel, Message und Debug inkl. Details', () => {
      const err = new ApiError(
        400,
        'Bad Request',
        JSON.stringify({
          code: 'VALIDATION_FAILED',
          message: 'Ein oder mehrere Eingabewerte sind ungültig.',
          details: [
            { field: 'version', message: 'darf nicht leer sein' },
            { message: 'allgemeiner Fehler' },
          ],
        }),
      );

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Ein oder mehrere Eingabewerte sind ungültig.',
        debug: '(400 - VALIDATION_FAILED - version: darf nicht leer sein, allgemeiner Fehler)',
      });
    });

    it('formatiert plain object mit unbekanntem Status', () => {
      const err = {
        status: 418,
        code: 'TEAPOT',
        message: 'No coffee',
      };

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'No coffee',
        debug: '(418 - TEAPOT)',
      });
    });

    it('formatiert Fehler nur mit Status ohne Code', () => {
      const err = {
        status: 500,
        message: 'Kaputt',
      };

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Kaputt',
        debug: '(500)',
      });
    });

    it('liest status/code/message/details aus response.data', () => {
      const err = {
        response: {
          status: 400,
          data: {
            code: 'VALIDATION_FAILED',
            message: 'Bitte korrigieren Sie die markierten Felder.',
            details: [{ field: 'token', message: 'abgelaufen' }],
          },
        },
      };

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Bitte korrigieren Sie die markierten Felder.',
        debug: '(400 - VALIDATION_FAILED - token: abgelaufen)',
      });
    });

    it('nimmt err.code und err.data.message wenn response.data fehlt', () => {
      const err = {
        status: 400,
        code: 'BAD_REQUEST',
        data: {
          message: 'Schon vorhanden',
        },
      };

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Schon vorhanden',
        debug: '(400 - BAD_REQUEST)',
      });
    });

    it('nutzt Fallback und kein Debug wenn nichts Verwertbares vorhanden ist', () => {
      expect(formatApiError({ foo: 'bar' }, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Fallback',
        debug: null,
      });
    });

    it('ignoriert leere Detail-Einträge im Debug-String', () => {
      const err = {
        response: {
          status: 400,
          data: {
            code: 'BAD_REQUEST',
            message: 'Ungültig',
            details: [
              {},
              { field: 'name', message: '   ' },
              { field: 'name', message: 'Pflichtfeld' },
              { message: 'allgemein' },
            ],
          },
        },
      };

      expect(formatApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Ungültig',
        debug: '(400 - BAD_REQUEST - name: Pflichtfeld, allgemein)',
      });
    });
  });

  describe('formatBackendApiError', () => {
    it('ist kompatibel zu formatApiError', () => {
      const err = {
        response: {
          status: 401,
          data: {
            code: 'UNAUTHORIZED',
            message: 'Nicht autorisiert',
          },
        },
      };

      expect(formatBackendApiError(err, 'Fallback')).toEqual({
        title: 'Fehler',
        message: 'Nicht autorisiert',
        debug: '(401 - UNAUTHORIZED)',
      });
    });
  });

  describe('status message helpers', () => {
    it('wandelt Fehler in StatusMessageState um', () => {
      const err = {
        response: {
          status: 401,
          data: {
            code: 'UNAUTHORIZED',
            message: 'Nicht autorisiert',
          },
        },
      };

      expect(toErrorStatusMessage(err, 'Fallback')).toEqual({
        type: 'error',
        title: 'Fehler',
        message: 'Nicht autorisiert',
        debug: '(401 - UNAUTHORIZED)',
      });
    });

    it('erstellt Success-Statusmeldung mit Default-Titel', () => {
      expect(toSuccessStatusMessage('Alles gut')).toEqual({
        type: 'success',
        title: 'Erfolg',
        message: 'Alles gut',
        debug: null,
      });
    });

    it('erstellt Success-Statusmeldung mit Custom-Titel', () => {
      expect(toSuccessStatusMessage('Alles gut', 'Gespeichert')).toEqual({
        type: 'success',
        title: 'Gespeichert',
        message: 'Alles gut',
        debug: null,
      });
    });

    it('erstellt Info-Statusmeldung mit Default-Titel', () => {
      expect(toInfoStatusMessage('Nur zur Info')).toEqual({
        type: 'info',
        title: 'Hinweis',
        message: 'Nur zur Info',
        debug: null,
      });
    });

    it('erstellt Info-Statusmeldung mit Custom-Titel und Debug', () => {
      expect(toInfoStatusMessage('Nur zur Info', 'Info', 'dbg')).toEqual({
        type: 'info',
        title: 'Info',
        message: 'Nur zur Info',
        debug: 'dbg',
      });
    });

    it('erstellt Warning-Statusmeldung mit Default-Titel', () => {
      expect(toWarningStatusMessage('Achtung')).toEqual({
        type: 'warning',
        title: 'Warnung',
        message: 'Achtung',
        debug: null,
      });
    });

    it('erstellt Warning-Statusmeldung mit Custom-Titel und Debug', () => {
      expect(toWarningStatusMessage('Achtung', 'Bitte prüfen', 'dbg')).toEqual({
        type: 'warning',
        title: 'Bitte prüfen',
        message: 'Achtung',
        debug: 'dbg',
      });
    });
  });
});
