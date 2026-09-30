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

// mappers.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    toLoadedPackageData,
    mapTemplateMarkdownStates,
    mapTemplateJsonStates,
} from '../../../composables/templatesManagement/mappers';
import * as parsers from '../../../composables/templatesManagement/parsers';

describe('toLoadedPackageData', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps parsed backend data into normalized package state', () => {
        vi.spyOn(parsers, 'safeParse')
            .mockReturnValueOnce({
                packagename: 'pkg-from-pkg',
                version: '1.2.3',
                title: 'Package Title',
                description: 'Package Description',
                author: 'Max Mustermann',
                dependencies: 'dep1, dep2',
                altTitle: 'Alt Title',
                keywords: ['fhir', 'package'],
                copyright: 'Copyright 2026',
            })
            .mockReturnValueOnce({
                'package-name': 'pkg-from-meta',
                'package-version': '9.9.9',
            })
            .mockReturnValueOnce({
                'package-name': 'pkg-from-changelog',
                'package-version': '8.8.8',
                changes: ['change 1', 'change 2'],
            })
            .mockReturnValueOnce([{ name: 'file1.txt' }]);

        const details = {
            packageTemplateJson: '{"packagename":"pkg-from-pkg"}',
            metadatenJson: '{"package-name":"pkg-from-meta"}',
            changelogsJson: '{"package-name":"pkg-from-changelog"}',
            externalSourcesMd: 'external text',
            fhirConversionNotesMd: 'fhir text',
            noteOnAuthorMd: 'author text',
            notesOnUpdateCyclesMd: 'cycles text',
            descriptionGenericMd: 'generic text',
            downloadConditionsXml: '<xml>test</xml>',
            inputFiles: '[{"name":"file1.txt"}]',
        } as any;

        const result = toLoadedPackageData(details);

        expect(result).toEqual({
            pkgJson: {
                packagename: 'pkg-from-pkg',
                version: '1.2.3',
                title: 'Package Title',
                description: 'Package Description',
                author: 'Max Mustermann',
                dependencies: 'dep1, dep2',
                altTitle: 'Alt Title',
                keywords: ['fhir', 'package'],
                copyright: 'Copyright 2026',
            },
            metaJson: {
                'package-name': 'pkg-from-meta',
                'package-version': '9.9.9',
            },
            changelogsJson: {
                'package-name': 'pkg-from-changelog',
                'package-version': '8.8.8',
                changes: ['change 1', 'change 2'],
            },
            markdown: {
                external: 'external text',
                fhir: 'fhir text',
                author: 'author text',
                cycles: 'cycles text',
                generic: 'generic text',
            },
            downloadConditions: '<xml>test</xml>',
            inputFiles: [{ name: 'file1.txt' }],
        });
    });

    it('falls back to metadata when package name and version are missing in pkg json', () => {
        vi.spyOn(parsers, 'safeParse')
            .mockReturnValueOnce({})
            .mockReturnValueOnce({
                'package-name': 'meta-package',
                'package-version': '2.0.0',
            })
            .mockReturnValueOnce({})
            .mockReturnValueOnce([]);

        const details = {
            packageTemplateJson: '{}',
            metadatenJson: '{}',
            changelogsJson: '{}',
            externalSourcesMd: null,
            fhirConversionNotesMd: null,
            noteOnAuthorMd: null,
            notesOnUpdateCyclesMd: null,
            descriptionGenericMd: null,
            downloadConditionsXml: null,
            inputFiles: '[]',
        } as any;

        const result = toLoadedPackageData(details);

        expect(result.pkgJson.packagename).toBe('meta-package');
        expect(result.pkgJson.version).toBe('2.0.0');
        expect(result.changelogsJson['package-name']).toBe('meta-package');
        expect(result.changelogsJson['package-version']).toBe('2.0.0');
    });

    it('falls back to changelog when package name and version are missing in pkg and metadata', () => {
        vi.spyOn(parsers, 'safeParse')
            .mockReturnValueOnce({})
            .mockReturnValueOnce({})
            .mockReturnValueOnce({
                'package-name': 'changelog-package',
                'package-version': '3.1.4',
            })
            .mockReturnValueOnce([]);

        const details = {
            packageTemplateJson: '{}',
            metadatenJson: '{}',
            changelogsJson: '{}',
            inputFiles: '[]',
        } as any;

        const result = toLoadedPackageData(details);

        expect(result.pkgJson.packagename).toBe('changelog-package');
        expect(result.pkgJson.version).toBe('3.1.4');
        expect(result.changelogsJson['package-name']).toBe('changelog-package');
        expect(result.changelogsJson['package-version']).toBe('3.1.4');
    });

    it('uses empty string fallbacks and empty arrays when parsed values are missing or invalid', () => {
        vi.spyOn(parsers, 'safeParse')
            .mockReturnValueOnce({
                keywords: 'not-an-array',
            })
            .mockReturnValueOnce({})
            .mockReturnValueOnce({
                changes: 'not-an-array',
            })
            .mockReturnValueOnce([]);

        const details = {
            packageTemplateJson: '{}',
            metadatenJson: '{}',
            changelogsJson: '{}',
            externalSourcesMd: undefined,
            fhirConversionNotesMd: undefined,
            noteOnAuthorMd: undefined,
            notesOnUpdateCyclesMd: undefined,
            descriptionGenericMd: undefined,
            downloadConditionsXml: undefined,
            inputFiles: '[]',
        } as any;

        const result = toLoadedPackageData(details);

        expect(result).toEqual({
            pkgJson: {
                packagename: '',
                version: '',
                title: '',
                description: '',
                author: '',
                dependencies: '',
                altTitle: '',
                keywords: [],
                copyright: '',
            },
            metaJson: {},
            changelogsJson: {
                'package-name': '',
                'package-version': '',
                changes: [],
            },
            markdown: {
                external: '',
                fhir: '',
                author: '',
                cycles: '',
                generic: '',
            },
            downloadConditions: '',
            inputFiles: [],
        });
    });

    it('passes the expected fallback defaults into safeParse', () => {
        const safeParseSpy = vi
            .spyOn(parsers, 'safeParse')
            .mockReturnValueOnce({})
            .mockReturnValueOnce({})
            .mockReturnValueOnce({})
            .mockReturnValueOnce([]);

        const details = {
            packageTemplateJson: '{"a":1}',
            metadatenJson: '{"b":2}',
            changelogsJson: '{"c":3}',
            inputFiles: '[]',
        } as any;

        toLoadedPackageData(details);

        expect(safeParseSpy).toHaveBeenNthCalledWith(1, '{"a":1}', {});
        expect(safeParseSpy).toHaveBeenNthCalledWith(2, '{"b":2}', {});
        expect(safeParseSpy).toHaveBeenNthCalledWith(3, '{"c":3}', {});
        expect(safeParseSpy).toHaveBeenNthCalledWith(4, '[]', []);
    });
});

describe('mapTemplateMarkdownStates', () => {
    it('maps markdown items into editable state', () => {
        const result = mapTemplateMarkdownStates([
            {
                canonicalUrl: 'http://example.org/a',
                version: '1.0.0',
                markdown: '# Title',
            },
        ]);

        expect(result).toEqual([
            {
                originalCanonicalUrl: 'http://example.org/a',
                canonicalUrl: 'http://example.org/a',
                originalVersion: '1.0.0',
                version: '1.0.0',
                markdown: '# Title',
            },
        ]);
    });

    it('normalizes null and undefined values to empty strings', () => {
        const result = mapTemplateMarkdownStates([
            {
                canonicalUrl: null,
                version: undefined,
                markdown: null,
            },
        ]);

        expect(result).toEqual([
            {
                originalCanonicalUrl: '',
                canonicalUrl: '',
                originalVersion: '',
                version: '',
                markdown: '',
            },
        ]);
    });

    it('returns an empty array for nullish input', () => {
        expect(mapTemplateMarkdownStates([])).toEqual([]);
    });
});

describe('mapTemplateJsonStates', () => {
    it('keeps json as-is when it is already a string', () => {
        const result = mapTemplateJsonStates([
            {
                name: 'template-a',
                json: '{"test":true}',
            },
        ]);

        expect(result).toEqual([
            {
                name: 'template-a',
                json: '{"test":true}',
                jsonValid: true,
            },
        ]);
    });

    it('stringifies object json with indentation', () => {
        const result = mapTemplateJsonStates([
            {
                name: 'template-b',
                json: { test: true },
            },
        ]);

        expect(result).toEqual([
            {
                name: 'template-b',
                json: JSON.stringify({ test: true }, null, 2),
                jsonValid: true,
            },
        ]);
    });

    it('normalizes missing json to an empty object string', () => {
        const result = mapTemplateJsonStates([
            {
                name: 'template-c',
            },
        ]);

        expect(result).toEqual([
            {
                name: 'template-c',
                json: JSON.stringify({}, null, 2),
                jsonValid: true,
            },
        ]);
    });

    it('returns an empty array for empty input', () => {
        expect(mapTemplateJsonStates([])).toEqual([]);
    });
});
