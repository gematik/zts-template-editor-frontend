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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePackage, type ExternalPackageData } from '../../composables/usePackageData';
import type { PackageModel, MetadataFile, ChangelogFile, MarkdownContent, ChangeEntry } from '../../types';


const hoistedMocks = vi.hoisted(() => {
  // === DEBOUNCE MOCKS ===
  const mockDebounceFn = vi.fn();
  const syncFn = null as Function | null;


  const mockDefaultPkg: (name: string, version: string) => PackageModel = vi.fn((name: string, version: string) => ({
    packagename: name || 'default.test.package', version: version || '0.0.1', title: '', description: '', author: '', dependencies: '', altTitle: '', keywords: [], copyright: ''
  }));
  const mockDefaultMeta: (name: string, version: string) => MetadataFile = (name: string, version: string) => ({
    'package-name': name || 'default.test.package', 'package-version': version || '0.0.1', status: 'active', 'publish-to-hl7': false, 'additional-keywords': '', protected: false
  });
  const mockDefaultChangelogs: (name: string, version: string) => ChangelogFile = (name: string, version: string) => ({
    'package-name': name || 'default.test.package', 'package-version': version || '0.0.1', changes: []
  });
  const mockDefaultMarkdown: () => MarkdownContent = () => ({
    external: '#### Weiterführende Informationen und externe Quellen', fhir: '#### Information zum FHIR-Package', author: '#### Information zum Autor', cycles: '#### Aktualisierungshinweise', generic: '#### Einleitung'
  });


  const mockValidatePackage = vi.fn((): Record<string, string> => ({}));

  return {
    mockDebounceFn,
    syncFn,
    mockDefaultPkg,
    mockDefaultMeta,
    mockDefaultChangelogs,
    mockDefaultMarkdown,
    mockValidatePackage,
  };
});

vi.mock('@vueuse/core', () => ({
  useDebounceFn: (fn: Function, delay: number) => {
    hoistedMocks.syncFn = fn;
    hoistedMocks.mockDebounceFn(fn, delay);
    return () => { };
  },
}));


vi.mock('../../utils/defaultTemplateData', () => ({
  createDefaultPackageJson: vi.fn(hoistedMocks.mockDefaultPkg),
  createDefaultMetaJson: vi.fn(hoistedMocks.mockDefaultMeta),
  createDefaultChangelogsJson: vi.fn(hoistedMocks.mockDefaultChangelogs),
  createDefaultMarkdown: vi.fn(hoistedMocks.mockDefaultMarkdown),
}));


vi.mock('../../validation/rules', () => ({
  validatePackageTemplate: hoistedMocks.mockValidatePackage,
}));


describe('Test Composable usePackageData', () => {

  const initialName = 'test.package.de';
  const initialVersion = '1.0.0';

  const changeEntry: ChangeEntry = { type: 'feature', description: 'Added a new template validation rule.' };


  const externalData: ExternalPackageData = {
    pkgJson: { ...hoistedMocks.mockDefaultPkg(initialName, initialVersion), title: 'External' } as PackageModel,
    metaJson: { ...hoistedMocks.mockDefaultMeta(initialName, initialVersion), status: 'final' } as MetadataFile,
    changelogsJson: { ...hoistedMocks.mockDefaultChangelogs(initialName, initialVersion), changes: [changeEntry] } as ChangelogFile,
    markdown: { ...hoistedMocks.mockDefaultMarkdown(), external: 'External MD' } as MarkdownContent,
  }

  const mockGetDataFn = vi.mocked(vi.fn<() => ExternalPackageData | null | undefined>());

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDataFn.mockClear();
    hoistedMocks.syncFn = null;
  });

  it('Test: sollte den initialen Zustand korrekt mit Defaults setzen', () => {

    mockGetDataFn.mockReturnValue(undefined);

    const { pkgJson } = usePackage(mockGetDataFn, initialName, initialVersion);

    expect(pkgJson.value.packagename).toBe(initialName);
    expect(pkgJson.value.version).toBe(initialVersion);
    expect(hoistedMocks.mockDefaultPkg).toHaveBeenCalledWith(initialName, initialVersion);
  });

  it('Test: sollte den Zustand mit externen Daten initialisieren/aktualisieren', () => {

    mockGetDataFn.mockReturnValue(undefined);

    const { pkgJson, metaJson, changelogsJson, markdown } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value = externalData.pkgJson!;
    metaJson.value = externalData.metaJson!;
    changelogsJson.value = externalData.changelogsJson!;
    markdown.value = externalData.markdown!;

    expect(pkgJson.value.title).toBe('External');
    expect(metaJson.value.status).toBe('final');
    expect(changelogsJson.value.changes.length).toBe(1);
    expect(markdown.value.external).toBe('External MD');
  });


  it('Test: Immediate-Watch setzt externe Daten und triggert syncChanges', () => {

    mockGetDataFn.mockReturnValue(externalData);

    const { pkgJson, metaJson, changelogsJson, markdown } = usePackage(mockGetDataFn, initialName, initialVersion);

    expect(pkgJson.value.packagename).toBe('test.package.de');
    expect(pkgJson.value.version).toBe('1.0.0');
    expect(markdown.value.external).toBe('External MD');

    expect(metaJson.value['package-name']).toBe('test.package.de');
    expect(metaJson.value['package-version']).toBe('1.0.0');
    expect(changelogsJson.value['package-name']).toBe('test.package.de');
    expect(changelogsJson.value['package-version']).toBe('1.0.0');

    expect(Array.isArray(changelogsJson.value.changes)).toBe(true);
    expect(changelogsJson.value.changes.length).toBe(1);
  });


  it('Test: sollte metaJson und changelogsJson synchronisieren, wenn pkgJson sich ändert', () => {
    mockGetDataFn.mockReturnValue(undefined);
    const { pkgJson, metaJson, changelogsJson } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value.packagename = 'new.name';
    pkgJson.value.version = '1.2.3';

    const syncFn = hoistedMocks.syncFn;
    expect(typeof syncFn).toBe('function');

    if (syncFn) {
      syncFn();
    }


    expect(metaJson.value['package-name']).toBe('new.name');
    expect(changelogsJson.value['package-version']).toBe('1.2.3');
  });

  it('Test: package.template.json lässt leere optionale Felder weg', () => {
    mockGetDataFn.mockReturnValue(undefined);
    const { pkgJson, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value.title = 'OPS';
    pkgJson.value.description = 'OPS';
    pkgJson.value.author = 'OPS';
    pkgJson.value.altTitle = 'OPS';
    pkgJson.value.dependencies = '   ';
    pkgJson.value.copyright = '';
    pkgJson.value.keywords = [];

    const changes = buildCommitChanges('update');
    const pkgChange = changes.find(c => c.fileName === 'package.template.json');
    expect(pkgChange).toBeDefined();

    const parsed = JSON.parse(String(pkgChange?.content));
    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.copyright).toBeUndefined();
    expect(parsed.keywords).toBeUndefined();
    expect(parsed.title).toBe('OPS');
  });

  it('Test: sollte CommitChange-Objekte für den Update-Fall korrekt erstellen', () => {
    mockGetDataFn.mockReturnValue(undefined);
    const { pkgJson, metaJson, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value.title = 'Test Title';
    metaJson.value['additional-keywords'] = 'test';

    const changes = buildCommitChanges('update');

    expect(changes.length).toBe(8);

    const pkgChange = changes.find(c => c.fileName === 'package.template.json');

    expect(pkgChange).toBeDefined();
    expect(pkgChange?.action).toBe('update');
    expect(pkgChange?.content).toContain('Test Title');
  });

  it('Test: sollte CommitChange-Objekte für den Create-Fall korrekt erstellen', () => {
    mockGetDataFn.mockReturnValue(undefined);
    const { buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    const changes = buildCommitChanges('create');
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes[0]?.action).toBe('create');
    expect(changes[1]?.action).toBe('create');
  });


  it('Test: sollte pkgErrors aus der Validierungsfunktion zurückgeben', () => {
    const mockErrors = {
      title: 'Pflichtfeld',
      altTitle: 'Pflichtfeld',
      description: 'Pflichtfeld',
      author: 'Pflichtfeld',
      keywords: 'Mind. 1 Keyword',
    } as Record<string, string>;
    hoistedMocks.mockValidatePackage.mockReturnValueOnce(mockErrors);

    const { pkgErrors } = usePackage(mockGetDataFn, initialName, initialVersion);

    expect(pkgErrors.value).toEqual(mockErrors);
  });

  it('Test: Update ohne Änderungen erzeugt keine CommitChange-Einträge', () => {
    // baseline aus externen Daten setzen
    const dataWithBaseline: ExternalPackageData = {
      ...externalData,
    };
    mockGetDataFn.mockReturnValue(dataWithBaseline);

    const { buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);
    const changes = buildCommitChanges('update');
    expect(changes.length).toBe(0);
  });

  it('Test: Markdown-CRLF wird normalisiert (keine Änderung)', () => {
    // baseline external mit CRLF, state external mit LF -> keine Änderung
    const dataWithCrlf: ExternalPackageData = {
      ...externalData,
      markdown: { ...externalData.markdown!, external: 'line1\r\nline2' },
    };
    mockGetDataFn.mockReturnValue(dataWithCrlf);

    const { markdown, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);
    markdown.value.external = 'line1\nline2';
    const changes = buildCommitChanges('update');
    const externalMdChange = changes.find(c => c.fileName === 'externalSources.md');
    expect(externalMdChange).toBeUndefined();
  });

  it('Test: Markdown-Änderung wird erkannt (fhirConversionNotes.md)', () => {
    mockGetDataFn.mockReturnValue(externalData);
    const { markdown, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);
    markdown.value.fhir = (externalData.markdown!.fhir || '') + '\nMore';
    const changes = buildCommitChanges('update');
    const fhirChange = changes.find(c => c.fileName === 'fhirConversionNotes.md');
    expect(fhirChange).toBeDefined();
    expect(fhirChange?.content).toContain('More');
  });

  it('Test: Changelogs-Änderung wird erkannt (changelogs.json)', () => {
    mockGetDataFn.mockReturnValue(externalData);
    const { changelogsJson, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);
    changelogsJson.value.changes.push({ type: 'bugfix', description: 'Bugfix' });
    const changes = buildCommitChanges('update');
    const clChange = changes.find(c => c.fileName === 'changelogs.json');
    expect(clChange).toBeDefined();
    expect(clChange?.content).toContain('Bugfix');
  });

  it('Test: setzt bei externalData = null alle States wieder auf Defaults zurück', () => {
    let currentData: ExternalPackageData | null | undefined = externalData;
    const getData = () => currentData;

    const pkg = usePackage(getData, initialName, initialVersion);

    expect(pkg.pkgJson.value.title).toBe('External');
    expect(pkg.markdown.value.external).toBe('External MD');

    currentData = null;

    const pkg2 = usePackage(getData, initialName, initialVersion);

    expect(pkg2.pkgJson.value.packagename).toBe(initialName);
    expect(pkg2.pkgJson.value.version).toBe(initialVersion);
    expect(pkg2.downloadConditions.value).toBe('');
    expect(pkg2.inputFiles.value).toEqual([]);
  });

  it('Test: syncChanges setzt Initial-Feature-Text bei fehlender Baseline automatisch', () => {
    mockGetDataFn.mockReturnValue(undefined);

    const { pkgJson, changelogsJson } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value.packagename = 'de.test.pkg';
    pkgJson.value.version = '9.8.7';
    changelogsJson.value.changes = [
      { type: 'feature', description: 'alt' } as ChangeEntry
    ];

    const syncFn = hoistedMocks.syncFn;
    expect(typeof syncFn).toBe('function');

    if (syncFn) {
      syncFn();
    }

    expect(changelogsJson.value.changes[0]?.description).toBe(
      'Initiale Version des FHIR-Packages für de.test.pkg Version 9.8.7.'
    );
  });

  it('Test: syncChanges überschreibt Feature-Text NICHT, wenn Baseline vorhanden ist', () => {
    mockGetDataFn.mockReturnValue({
      ...externalData,
      changelogsJson: {
        ...externalData.changelogsJson!,
        changes: [{ type: 'feature', description: 'bestehend' } as ChangeEntry],
      } as ChangelogFile,
    });

    const { pkgJson, changelogsJson } = usePackage(mockGetDataFn, initialName, initialVersion);

    pkgJson.value.packagename = 'de.test.pkg';
    pkgJson.value.version = '9.8.7';

    const syncFn = hoistedMocks.syncFn;
    expect(typeof syncFn).toBe('function');

    if (syncFn) {
      syncFn();
    }

    expect(changelogsJson.value.changes[0]?.description).toBe('bestehend');
  });

  it('Test: erkennt Markdown-Änderungen auch für author/cycles/generic', () => {
    mockGetDataFn.mockReturnValue(externalData);

    const { markdown, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    markdown.value.author = `${markdown.value.author}\nA`;
    markdown.value.cycles = `${markdown.value.cycles}\nB`;
    markdown.value.generic = `${markdown.value.generic}\nC`;

    const changes = buildCommitChanges('update');

    expect(changes.find(c => c.fileName === 'noteOnAuthor.md')).toBeDefined();
    expect(changes.find(c => c.fileName === 'notesOnUpdateCycles.md')).toBeDefined();
    expect(changes.find(c => c.fileName === 'descriptionGeneric.md')).toBeDefined();
  });

  it('Test: create schreibt download-conditions.xml mit, wenn Inhalt vorhanden ist', () => {
    mockGetDataFn.mockReturnValue(undefined);

    const { downloadConditions, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    downloadConditions.value = '<xml>abc</xml>';

    const changes = buildCommitChanges('create');
    const dc = changes.find(c => c.fileName === 'download-conditions.xml');

    expect(dc).toBeDefined();
    expect(dc?.action).toBe('create');
    expect(dc?.content).toBe('<xml>abc</xml>');
  });

  it('Test: update erzeugt create für download-conditions.xml, wenn vorher leer und jetzt befüllt', () => {
    mockGetDataFn.mockReturnValue({
      ...externalData,
      downloadConditions: '',
    });

    const { downloadConditions, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    downloadConditions.value = '<xml>neu</xml>';

    const changes = buildCommitChanges('update');
    const dc = changes.find(c => c.fileName === 'download-conditions.xml');

    expect(dc).toBeDefined();
    expect(dc?.action).toBe('create');
    expect(dc?.content).toBe('<xml>neu</xml>');
  });

  it('Test: update erzeugt update für download-conditions.xml, wenn vorher und nachher Inhalt vorhanden ist', () => {
    mockGetDataFn.mockReturnValue({
      ...externalData,
      downloadConditions: '<xml>alt</xml>',
    });

    const { downloadConditions, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    downloadConditions.value = '<xml>neu</xml>';

    const changes = buildCommitChanges('update');
    const dc = changes.find(c => c.fileName === 'download-conditions.xml');

    expect(dc).toBeDefined();
    expect(dc?.action).toBe('update');
    expect(dc?.content).toBe('<xml>neu</xml>');
  });

  it('Test: update erzeugt delete für download-conditions.xml, wenn vorher Inhalt vorhanden war und jetzt leer ist', () => {
    mockGetDataFn.mockReturnValue({
      ...externalData,
      downloadConditions: '<xml>alt</xml>',
    });

    const { downloadConditions, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    downloadConditions.value = '';

    const changes = buildCommitChanges('update');
    const dc = changes.find(c => c.fileName === 'download-conditions.xml');

    expect(dc).toBeDefined();
    expect(dc?.action).toBe('delete');
    expect(dc?.content).toBeNull();
  });

  it('Test: update erzeugt KEINEN download-conditions Change bei nur Leerzeichen auf beiden Seiten', () => {
    mockGetDataFn.mockReturnValue({
      ...externalData,
      downloadConditions: '   ',
    });

    const { downloadConditions, buildCommitChanges } = usePackage(mockGetDataFn, initialName, initialVersion);

    downloadConditions.value = '   ';

    const changes = buildCommitChanges('update');
    const dc = changes.find(c => c.fileName === 'download-conditions.xml');

    expect(dc).toBeUndefined();
  });
});