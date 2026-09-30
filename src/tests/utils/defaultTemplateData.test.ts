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
import {

    createDefaultPackageJson,
    createDefaultMetaJson,
    createDefaultChangelogsJson,
    createDefaultMarkdown
} from '../../utils/defaultTemplateData';

describe('Hilfsfunktionen für Standard-Template-Daten', () => {
    it('Test: createDefaultPackageJson liefert erwartete Standardwerte', () => {
        const pkg = createDefaultPackageJson('demo-package', '1.2.3');
        expect(pkg.packagename).toBe('demo-package');
        expect(pkg.version).toBe('1.2.3');
        expect(pkg.title).toBe('');
        expect(pkg.description).toBe('');
        expect(pkg.author).toBe('');
        expect(pkg.dependencies).toBe('');
        expect(pkg.altTitle).toBe('');
        expect(pkg.keywords).toEqual([]);
        expect(pkg.copyright).toBe('');
    });

    it('Test: createDefaultMetaJson setzt package-name und Standardwerte', () => {
        const meta = createDefaultMetaJson('demo-package', '0.0.1');
        expect(meta['package-name']).toBe('demo-package');
        expect(meta['package-version']).toBe('0.0.1');
        expect(meta.status).toBe('active');
        expect(meta['publish-to-hl7']).toBe(false);
        expect(meta['additional-keywords']).toBe('');
        expect(meta.protected).toBe(false);
    });

    it('Test: createDefaultChangelogsJson setzt package-name und initialen Change-Eintrag', () => {
        const packageName = 'cool-lib';
        const version = '2.5.0';
        const changelog = createDefaultChangelogsJson(packageName, version);
        expect(changelog['package-name']).toBe(packageName);
        expect(changelog['package-version']).toBe(version);
        expect(Array.isArray(changelog.changes)).toBe(true);
        expect(changelog.changes).toHaveLength(1);
        const entry = changelog.changes[0]!;
        expect(entry.type).toBe('feature');
        expect(entry.description).toContain(packageName);
        expect(entry.description).toContain(version);
        expect(entry.description).toMatch(/^Initiale Version des FHIR-Packages für .* Version .*\.?$/);
    });

    it('Test: createDefaultMarkdown liefert alle benötigten Markdown-Sektionen', () => {
        const md = createDefaultMarkdown();
        expect(md.external).toBe('#### Weiterführende Informationen und externe Quellen');
        expect(md.fhir).toBe('#### Information zum FHIR-Package');
        expect(md.author).toBe('#### Information zum Autor');
        expect(md.cycles).toBe('#### Aktualisierungshinweise');
    });

    it('Test: jede Factory gibt eine neue Objektinstanz zurück', () => {
        const a = createDefaultPackageJson('x', '1.0.0');
        const b = createDefaultPackageJson('x', '1.0.0');
        expect(a).not.toBe(b);

        const m1 = createDefaultMetaJson('x', '1.0.0');
        const m2 = createDefaultMetaJson('x', '1.0.0');
        expect(m1).not.toBe(m2);

        const c1 = createDefaultChangelogsJson('x', '1.0.0');
        const c2 = createDefaultChangelogsJson('x', '1.0.0');
        expect(c1).not.toBe(c2);

        const md1 = createDefaultMarkdown();
        const md2 = createDefaultMarkdown();
        expect(md1).not.toBe(md2);
    });

    it('Test: unterstützt Paketnamen mit Sonderzeichen', () => {
        const name = '@scope/my-package.name';
        const version = '3.0.0-beta.1';
        const meta = createDefaultMetaJson(name, version);
        const changelog = createDefaultChangelogsJson(name, version);
        expect(meta['package-name']).toBe(name);
        expect(changelog['package-name']).toBe(name);
        expect(changelog.changes[0]!.description).toContain(name);
        expect(changelog.changes[0]!.description).toContain(version);
    });
});