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

// analysis.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { analyzePreviousPackageData, sortVersionsDescending } from '../../../composables/templatesManagement/previousVersions';
import * as validationRules from '../../../validation/rules';

describe('analyzePreviousPackageData', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns no warnings when validation passes', () => {
        vi.spyOn(validationRules, 'validatePackageTemplate').mockReturnValue({});

        const pkg = {
            pkgJson: {
                packagename: 'test-package',
                version: '1.2.3',
            },
        } as any;

        const result = analyzePreviousPackageData(pkg, '1.2.3');

        expect(result).toEqual({
            warnings: [],
            version: '1.2.3',
        });
    });

    it('returns a warning with all invalid fields when validation fails', () => {
        vi.spyOn(validationRules, 'validatePackageTemplate').mockReturnValue({
            packagename: 'Pflichtfeld fehlt',
            version: 'Ungültiges Format',
            author: 'Zu kurz',
        });

        const pkg = {
            pkgJson: {
                packagename: '',
                version: 'abc',
                author: 'x',
            },
        } as any;

        const result = analyzePreviousPackageData(pkg, '2.0.0');

        expect(result).toEqual({
            warnings: [
                'Package JSON: Ungültige oder fehlende Felder → packagename (Pflichtfeld fehlt), version (Ungültiges Format), author (Zu kurz)',
            ],
            version: '2.0.0',
        });
    });

    it('passes pkg.pkgJson into validatePackageTemplate', () => {
        const validateSpy = vi
            .spyOn(validationRules, 'validatePackageTemplate')
            .mockReturnValue({});

        const pkgJson = {
            packagename: 'mypackage',
            version: '3.1.0',
            title: 'My Package',
        };

        const pkg = {
            pkgJson,
        } as any;

        analyzePreviousPackageData(pkg, '3.1.0');

        expect(validateSpy).toHaveBeenCalledWith(pkgJson);
    });

    it('preserves the provided version even when warnings exist', () => {
        vi.spyOn(validationRules, 'validatePackageTemplate').mockReturnValue({
            version: 'Ungültig',
        });

        const pkg = {
            pkgJson: {
                version: 'broken',
            },
        } as any;

        const result = analyzePreviousPackageData(pkg, '9.9.9');

        expect(result.version).toBe('9.9.9');
        expect(result.warnings).toEqual([
            'Package JSON: Ungültige oder fehlende Felder → version (Ungültig)',
        ]);
    });
});

describe('sortVersionsDescending', () => {
    it('sorts semantic versions in descending order', () => {
        const versions = [
            { version: '1.0.0' },
            { version: '2.1.0' },
            { version: '1.10.0' },
            { version: '2.0.0' },
        ] as any[];

        const result = sortVersionsDescending(versions);

        expect(result).toEqual([
            { version: '2.1.0' },
            { version: '2.0.0' },
            { version: '1.10.0' },
            { version: '1.0.0' },
        ]);
    });

    it('sorts prerelease versions correctly', () => {
        const versions = [
            { version: '1.0.0' },
            { version: '1.0.0-beta.2' },
            { version: '1.0.0-beta.1' },
            { version: '1.0.0-rc.1' },
        ] as any[];

        const result = sortVersionsDescending(versions);

        expect(result).toEqual([
            { version: '1.0.0' },
            { version: '1.0.0-rc.1' },
            { version: '1.0.0-beta.2' },
            { version: '1.0.0-beta.1' },
        ]);
    });

    it('returns a new array and does not mutate the original input', () => {
        const versions = [
            { version: '1.0.0' },
            { version: '2.0.0' },
            { version: '1.5.0' },
        ] as any[];

        const originalCopy = [...versions];

        const result = sortVersionsDescending(versions);

        expect(result).not.toBe(versions);
        expect(versions).toEqual(originalCopy);
    });

    it('returns an empty array for empty input', () => {
        expect(sortVersionsDescending([])).toEqual([]);
    });
});
