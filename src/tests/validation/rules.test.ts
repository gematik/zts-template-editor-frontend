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

import { describe, it, expect } from 'vitest';
import { validateResourceTemplate, validatePackageTemplate } from '../../validation/rules';
import type { ResourceTemplateModel, PackageModel } from '../../types';

function resourceTemplate(overrides: Partial<ResourceTemplateModel> = {}): ResourceTemplateModel {
    return {
        version: '1.2.3',
        effectivePeriod: { start: '2024-01-01', end: '2024-12-31' },
        url: 'https://example.com/resource',
        resourceType: 'CodeSystem',
        title: 'A Title',
        publisher: 'Publisher',
        name: 'valid-name.123',
        language: 'de',
        identifier: [{ system: 'urn:example:system', value: 'ABC-123' }],
        description: 'Short description',
        date: '2024-05-06',
        contact: [{ name: 'Contact Person' }],
        ...overrides
    };
}

describe('Validierung: validateResourceTemplate', () => {
    it('Test: keine Fehler für vollständig gültiges Template', () => {
        const errors = validateResourceTemplate(resourceTemplate());
        expect(errors).toEqual({});
    });

    it('Test: markiert ungültige SemVer Version', () => {
        const errors = validateResourceTemplate(resourceTemplate({ version: '1.0' }));
        expect(errors.version).toBe('Ungültiges SemVer');
    });

    it('Test: markiert fehlende URL', () => {
        const errors = validateResourceTemplate(resourceTemplate({ url: '' }));
        expect(errors.url).toBe('Pflichtfeld');
    });

    it('Test: markiert ungültiges URL Format', () => {
        const errors = validateResourceTemplate(resourceTemplate({ url: 'https://exa mple.com/resource' }));
        expect(errors.url).toBe('Ungültige URI');
    });

    it('Test: markiert fehlenden resourceType', () => {
        const errors = validateResourceTemplate(resourceTemplate({ resourceType: '' as any }));
        expect(errors.resourceType).toBe('Pflichtfeld');
    });

    it('Test: markiert Titel >255 Zeichen', () => {
        const long = 't'.repeat(256);
        const errors = validateResourceTemplate(resourceTemplate({ title: long }));
        expect(errors.title).toBe('Max 255 Zeichen');
    });

    it('Test: markiert Publisher >255 Zeichen', () => {
        const long = 'p'.repeat(256);
        const errors = validateResourceTemplate(resourceTemplate({ publisher: long }));
        expect(errors.publisher).toBe('Max 255 Zeichen');
    });

    it('Test: markiert ungültiges Namensmuster', () => {
        const errors = validateResourceTemplate(resourceTemplate({ name: 'invalid name with space' }));
        expect(errors.name).toBe('Ungültig (1–64, A-Z a-z 0-9 - .)');
    });

    it('Test: markiert ungültige Sprache', () => {
        const errors = validateResourceTemplate(resourceTemplate({ language: 'de  DE' }));
        expect(errors.language).toBe('FHIR code erwartet');
    });

    it('Test: markiert ungültiges identifier.system', () => {
        const errors = validateResourceTemplate(resourceTemplate({ identifier: [{ system: 'bad uri', value: 'ABC-123' }] }));
        expect(errors['identifier.0.system']).toBe('FHIR uri erwartet');
    });

    it('Test: markiert ungültiges identifier.value', () => {
        const errors = validateResourceTemplate(resourceTemplate({ identifier: [{ system: 'urn:x', value: 'bad value' }] }));
        expect(errors['identifier.0.value']).toBe('FHIR string ohne Whitespaces erwartet');
    });

    it('Test: markiert Beschreibung >2000 Zeichen', () => {
        const long = 'd'.repeat(2001);
        const errors = validateResourceTemplate(resourceTemplate({ description: long }));
        expect(errors.description).toBe('Max 2000 Zeichen');
    });

    it('Test: markiert ungültiges Datum', () => {
        const errors = validateResourceTemplate(resourceTemplate({ date: '2024-13-01' }));
        expect(errors.date).toBe('Ungültiges Datum');
    });

    it('Test: markiert contact.name >255 Zeichen', () => {
        const long = 'c'.repeat(256);
        const errors = validateResourceTemplate(resourceTemplate({ contact: [{ name: long }] }));
        expect(errors['contact.0.name']).toBe('Max 255 Zeichen');
    });

    it('Test: markiert ungültiges effectivePeriod.start', () => {
        const errors = validateResourceTemplate(resourceTemplate({ effectivePeriod: { start: '2024-00-01', end: '2024-12-31' } }));
        expect(errors['effectivePeriod.start']).toBe('Ungültiges Datum');
    });

    it('Test: markiert ungültiges effectivePeriod.end', () => {
        const errors = validateResourceTemplate(resourceTemplate({ effectivePeriod: { start: '2024-01-01', end: '2024.01.30' } }));
        expect(errors['effectivePeriod.end']).toBe('Ungültiges Datum');
    });

    it('Test: erlaubt Weglassen optionaler Felder ohne Fehler', () => {
        const minimal = resourceTemplate({
            language: undefined,
            identifier: undefined,
            description: undefined,
            contact: undefined,
            effectivePeriod: undefined
        });
        const errors = validateResourceTemplate(minimal);
        expect(errors).toEqual({});
    });

});

function packageTemplate(overrides: Partial<PackageModel> = {}): PackageModel {
    return {
        packagename: 'a.b.c',
        version: '1.2.3',
        title: 'Titel',
        description: 'Beschreibung',
        author: 'Autor',
        dependencies: 'dep.pkg#1.0.0;another.dep#2.3.4',
        altTitle: 'Alternativer Titel',
        keywords: ['FHIR', 'HL7'],
        copyright: '© 2024 Beispiel',
        ...overrides
    };
}

describe('Validierung: validatePackageTemplate', () => {
    it('Test: keine Fehler für vollständig gültiges Package', () => {
        const errors = validatePackageTemplate(packageTemplate());
        expect(errors).toEqual({});
    });

    it('Test: markiert fehlenden packagename', () => {
        const errors = validatePackageTemplate(packageTemplate({ packagename: '' }));
        expect(errors.packagename).toBe('Pflichtfeld');
    });

    it('Test: markiert ungültiges packagename Format', () => {
        const errors = validatePackageTemplate(packageTemplate({ packagename: 'abc' }));
        expect(errors.packagename).toBe('Ungültiges Format (a.b.c)');
    });

    it('Test: markiert fehlende Version', () => {
        const errors = validatePackageTemplate(packageTemplate({ version: '' }));
        expect(errors.version).toBe('Pflichtfeld');
    });

    it('Test: markiert ungültiges SemVer', () => {
        const errors = validatePackageTemplate(packageTemplate({ version: '1.0' }));
        expect(errors.version).toBe('Ungültiges SemVer');
    });

    it('Test: markiert fehlenden Titel', () => {
        const errors = validatePackageTemplate(packageTemplate({ title: '' }));
        expect(errors.title).toBe('Pflichtfeld');
    });

    it('Test: markiert Titel >255 Zeichen', () => {
        const long = 't'.repeat(256);
        const errors = validatePackageTemplate(packageTemplate({ title: long }));
        expect(errors.title).toBe('Max 255 Zeichen');
    });

    it('Test: markiert fehlende Beschreibung', () => {
        const errors = validatePackageTemplate(packageTemplate({ description: '' }));
        expect(errors.description).toBe('Pflichtfeld');
    });

    it('Test: markiert Beschreibung >2000 Zeichen', () => {
        const long = 'd'.repeat(2001);
        const errors = validatePackageTemplate(packageTemplate({ description: long }));
        expect(errors.description).toBe('Max 2000 Zeichen');
    });

    it('Test: markiert fehlenden Autor', () => {
        const errors = validatePackageTemplate(packageTemplate({ author: '' }));
        expect(errors.author).toBe('Pflichtfeld');
    });

    it('Test: markiert Autor >255 Zeichen', () => {
        const long = 'a'.repeat(256);
        const errors = validatePackageTemplate(packageTemplate({ author: long }));
        expect(errors.author).toBe('Max 255 Zeichen');
    });

    it('Test: markiert ungültige Dependencies', () => {
        const errors = validatePackageTemplate(packageTemplate({ dependencies: 'bad-format' }));
        expect(errors.dependencies).toBe('Format: name#x.y.z(;...)');
    });

    it('Test: markiert fehlenden Alt-Titel', () => {
        const errors = validatePackageTemplate(packageTemplate({ altTitle: '' }));
        expect(errors.altTitle).toBe('Pflichtfeld');
    });

    it('Test: markiert Alt-Titel >100 Zeichen', () => {
        const long = 'x'.repeat(101);
        const errors = validatePackageTemplate(packageTemplate({ altTitle: long }));
        expect(errors.altTitle).toBe('Max 100 Zeichen');
    });

    it('Test: markiert leere Keywords-Liste', () => {
        const errors = validatePackageTemplate(packageTemplate({ keywords: [] }));
        expect(errors.keywords).toBe('Mind. 1 Keyword');
    });

    it('Test: markiert ungültiges Keyword-Format', () => {
        const errors = validatePackageTemplate(packageTemplate({ keywords: ['Gültig', 'ungültig!'] }));
        expect(errors.keywords).toBe('Keyword-Format ungültig');
    });

    it('Test: akzeptiert Keywords mit Unicode-Buchstaben und Trennzeichen', () => {
        const errors = validatePackageTemplate(packageTemplate({ keywords: ['Ärztliche_Übersicht-2.0'] }));
        expect(errors).not.toHaveProperty('keywords');
    });

    it('Test: markiert Keywords mit mehr als 30 Zeichen als ungültig', () => {
        const errors = validatePackageTemplate(packageTemplate({ keywords: ['abcdefghijklmnopqrstuvwxyz12345'] }));
        expect(errors.keywords).toBe('Keyword-Format ungültig');
    });

    it.each([
        ['LOINC - Linguistic Variant'],
        ['ICD-10-GM'],
        ['UCUM - Deutsche Übersetzung'],
        ['ORPHAcodes'],
        ['OPS'],
        ['ICF'],
        ['ICD-O-3'],
        ['ICD-10-WHO'],
        ['ATC DDD GM'],
        // eigene Realbeispiele hier ergänzen:
    ] as [string][])('Test: akzeptiert Keyword "%s"', (keyword: string) => {
        const errors = validatePackageTemplate(packageTemplate({ keywords: [keyword] }));
        expect(errors).not.toHaveProperty('keywords');
    });

    it('Test: markiert Copyright >255 Zeichen', () => {
        const long = 'c'.repeat(256);
        const errors = validatePackageTemplate(packageTemplate({ copyright: long }));
        expect(errors.copyright).toBe('Max 255 Zeichen');
    });
});