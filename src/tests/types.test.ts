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
import type {
  ProjectItem, VersionItem, BranchItem, PackageModel, MetadataFile,
  ChangelogFile, ChangeEntry, PackageState, MarkdownContent,
  MarkdownSection, ResourceTemplateModel, WorkspaceDetails, CommitChange, MergeRequestRef,
  TemplateJsonState,
  TemplateMdItem
} from '../types';

describe('Typdefinitionen (types.ts)', () => {

  // --- Basis-Item-Typen ---

  it('Test: Korrekte Konstruktur des Typs ProjectItem', () => {
    const project: ProjectItem = {
      projectId: 101,
      title: 'test.package.name',
      description: 'Ein Testprojekt für FHIR-Pakete',
      lastModified: '2023-10-27T10:00:00Z',
      mrStatus: 'Final'
    };
    expect(project.projectId).toBe(101);
    expect(project).toHaveProperty('mrStatus');
    expect(project.mrStatus).toBe('Final');
    expect(project.title).toBe('test.package.name');
    expect(project.description).toBe('Ein Testprojekt für FHIR-Pakete');
  });

  it('Test: Korrekte Konstruktur des Typs VersionItem', () => {
    const version: VersionItem = {
      version: '2025.0.0',
      lastModified: '2025-11-20',
      mrStatus: "Draft",
      mergeRequest: { id: 1, webUrl: 'http://gitlab/mr/1' }
    };
    expect(version.version).toBe('2025.0.0');
    expect(version.mrStatus).toBe("Draft");
    expect(version.mergeRequest).toEqual({ id: 1, webUrl: 'http://gitlab/mr/1' });
  });

  it('Test: Korrekte Konstruktur des Typs BranchItem', () => {
    const branch: BranchItem = {
      branch: 'feature/2023.0.0',
      lastModified: '2023-11-24',
      author: 'Tester',
      isDefaultBranch: false,
      isProtected: true,
      mergeRequest: { id: 2, webUrl: 'http://gitlab/mr/2' }
    };
    expect(branch.branch).toBe('feature/2023.0.0');
    expect(branch.isProtected).toBe(true);
    expect(branch.mergeRequest).toEqual({ id: 2, webUrl: 'http://gitlab/mr/2' });
    expect(branch.author).toBe('Tester');
    expect(branch.lastModified).toBe('2023-11-24');
    expect(branch.isDefaultBranch).toBe(false);
  });

  // --- JSON-Datenstrukturen ---

  it('Test: Korrekte Konstruktur des Typs ChangeEntry (gültiger Typ)', () => {
    const entry: ChangeEntry = {
      type: 'feature',
      description: 'Added a new template validation rule.'
    };
    expect(entry.type).toBe('feature');
  });

  it('Test: Korrekte Konstruktur des Typs ChangelogFile', () => {
    const changelog: ChangelogFile = {
      'package-name': 'fhir.base.test',
      'package-version': '1.0.1',
      changes: [{ type: 'bugfix', description: 'Fixed minor issue' }]
    };
    expect(changelog.changes.length).toBe(1);
    expect(changelog['package-version']).toBe('1.0.1');
  });

  it('Test: Korrekte Konstruktur des Typs MetadataFile', () => {
    const meta: MetadataFile = {
      'package-name': 'fhir.base.test',
      'package-version': '1.0.1',
      status: 'active',
      'publish-to-hl7': true,
      'additional-keywords': 'keyword1, keyword2',
      protected: false,
      'custom-field': 123
    };
    expect(meta.status).toBe('active');
    expect(meta['publish-to-hl7']).toBe(true);
    expect(meta).toHaveProperty('custom-field');
  });

  it('Test: Korrekte Konstruktur des Typs PackageModel', () => {
    const pkg: PackageModel = {
      packagename: 'fhir.base.test',
      version: '1.0.1',
      title: 'Basis-Testpaket',
      description: 'A base package for testing.',
      author: 'Test Author',
      dependencies: 'none',
      altTitle: 'Alternative Title',
      keywords: ['fhir', 'base', 'test'],
      copyright: 'CC0'
    };
    expect(pkg.keywords).toContain('test');
    expect(pkg.version).toBe('1.0.1');
  });



  it('Test: Korrekte Konstruktur der Typen MarkdownContent und MarkdownSection', () => {
    const content: MarkdownContent = {
      external: 'MD 1',
      fhir: 'MD 2',
      author: 'MD 3',
      cycles: 'MD 4',
      generic: 'MD 5'
    };
    const section: MarkdownSection = {
      key: 'author',
      label: 'Hinweis zum Autor',
      fileName: 'noteOnAuthorMd'
    };

    expect(content.author).toBe('MD 3');
    expect(section.key).toBe('author');
  });

  it('Test: Korrekte Konstruktur des Typs ResourceTemplateModel', () => {
    const template: ResourceTemplateModel = {
      version: '1.0.0',
      url: 'http://example.org/fhir/ValueSet/example',
      resourceType: 'ValueSet',
      title: 'Example Value Set',
      publisher: 'My Organization',
      name: 'ExampleValueSet',
      date: '2023-11-24',

      effectivePeriod: {
        start: '2023-01-01',
        end: '2023-12-31'
      },
      language: 'de-CH',
      identifier: [{
        system: 'urn:ietf:rfc:3986',
        value: 'temp-123'
      }],
      description: 'Dies ist eine **Beschreibung** in Markdown.',
      contact: [{
        name: 'Support Team'
      }],
    };


    expect(template.resourceType).toBe('ValueSet');


    expect(template.effectivePeriod?.start).toBe('2023-01-01');
    expect(template.identifier?.[0]?.value).toBe('temp-123');
    expect(template.description).toContain('**Beschreibung**');
    expect(template.contact?.[0]?.name).toBe('Support Team');
  });

  it('Test: Korrekte Konstruktur des Typs PackageState', () => {
    const state: PackageState = {
      pkgJson: { packagename: 'A', version: '1', title: '', description: '', author: '', dependencies: '', altTitle: '', keywords: [], copyright: '' },
      metaJson: { 'package-name': 'A', 'package-version': '1', status: 'draft', 'publish-to-hl7': false, 'additional-keywords': '', protected: false },
      changelogsJson: { 'package-name': 'A', 'package-version': '1', changes: [] },
      markdown: { external: '', fhir: '', author: '', cycles: '', generic: '' },
      downloadConditions: '',
      inputFiles: []
    };
    expect(state.markdown).toBeDefined();
    expect(state.pkgJson.packagename).toBe('A');
  });

  it('Test: Korrekte Konstruktur des Typs TemplateJsonState', () => {
    const template: TemplateJsonState = {
      name: 'ExampleTemplate',
      json: '{"resourceType": "ValueSet"}',
      jsonValid: true
    };
    expect(template.name).toBe('ExampleTemplate');
  });


  it('Test: Korrekte Konstruktur des Typs TemplateMDState', () => {
    const template: TemplateMdItem = {
      canonicalUrl: 'canoncialUrl.de',
      markdown: '#### Nice',
      version: "2025"
    };
    expect(template.canonicalUrl).toBe('canoncialUrl.de');
  });

  it('Test: Korrekte Konstruktur des Typs CommitChange', () => {
    const updateChange: CommitChange = {
      action: 'update',
      type: 'package_markdown', // Testet Union-Typ
      fileName: 'test.md',
      content: 'Updated content',
      encoding: 'text'
    };
    const deleteChange: CommitChange = {
      action: 'delete',
      type: 'template',
      fileName: 'old.json',
      content: null
    };

    expect(updateChange.action).toBe('update');
    expect(deleteChange.type).toBe('template');
  });

  it('Test: Korrekte Konstruktur des Typs MergeRequestRef', () => {
    const mr: MergeRequestRef = {
      id: 5,
      webUrl: 'https://gitlab.com/mr/5'
    };
    expect(mr.id).toBe(5);
  });

  it('Test: Korrekte Konstruktur des Typs WorkspaceDetails', () => {
    const details: WorkspaceDetails = {
      templatesJson: [],
      templatesMd: [],
      packageTemplateJson: '{}',
      metadatenJson: '{}',
      changelogsJson: '{}',
      externalSourcesMd: 'MD1',
      fhirConversionNotesMd: 'MD2',
      noteOnAuthorMd: 'MD3',
      notesOnUpdateCyclesMd: 'MD4',
      descriptionGenericMd: 'MD5',
      mergeRequest: { id: 10, webUrl: '...' },
      downloadConditionsXml: '',
      inputFiles: []
    };
    expect(details.mergeRequest?.id).toBe(10);
    expect(details.externalSourcesMd).toBe('MD1');
  });
});