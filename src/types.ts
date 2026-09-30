
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

export type StatusMessageState = {
  type: 'success' | 'error' | 'info' | 'warning' | null;
  title?: string | null;
  message: string | null;
  debug?: string | null;
};

export type ProjectItem = {
  projectId: number;
  description: string;
  title: string;
  lastModified: string;
  mrStatus?: 'Final' | 'Draft' | 'in Review' | 'Released Edit' | 'Error';
};

export type VersionItem = {
  version: string;
  lastModified: string;
  mrStatus?: 'Final' | 'Draft' | 'in Review' | 'Released Edit' | 'Error';
  mergeRequest?: MergeRequestRef
  branch?: string;
};

export type UserInfo = {
  sub?: string;
  sub_legacy?: string;
  name: string;
  nickname?: string;
  email?: string;
  email_verified?: boolean;
  profile?: string;
  picture?: string;
  groups: string[];
  is_reviewer: boolean;
}

export type BranchItem = {
  branch: string;
  lastModified?: string | null;
  author?: string | null;
  isDefaultBranch: boolean;
  isProtected: boolean;
  mergeRequest: MergeRequestRef | null;
};

export interface PackageModel {
  packagename: string;
  version: string;
  title: string;
  description: string;
  author: string;
  dependencies: string;
  altTitle: string;
  keywords: string[];
  copyright: string;
}

export interface MetadataFile {
  'package-name': string;
  'package-version': string;
  status: string;
  'publish-to-hl7': boolean;
  'additional-keywords': string;
  protected: boolean;
  [key: string]: any;
}

export interface ChangelogFile {
  'package-name': string;
  'package-version': string;
  changes: ChangeEntry[];
}

export interface ChangeEntry {
  type: 'bugfix' | 'improvement' | 'feature';
  description: string;
}

export interface PackageState {
  pkgJson: PackageModel;
  metaJson: MetadataFile;
  changelogsJson: ChangelogFile;
  markdown: MarkdownContent;
  downloadConditions: string;
  inputFiles: InputFiles[];
}

export interface TemplateMdItem {
  canonicalUrl: string;
  version: string;
  markdown: string;
}

export interface TemplateJsonState {
  name: string;
  json: string;
  jsonValid?: boolean;
}

export interface TemplateMarkdownState {
  originalCanonicalUrl?: string;
  canonicalUrl: string;
  originalVersion?: string;
  version: string;
  markdown: string;
}

export interface MarkdownContent {
  external: string;
  fhir: string;
  author: string;
  cycles: string;
  generic: string;
}

export interface MarkdownSection {
  key: keyof MarkdownContent;
  label: string;
  fileName: string;
}

export type TelecomItem = {
  system?: string;
  value?: string;
};

export type ContactDetailModel = {
  name?: string;
  telecom?: TelecomItem[];
};

export type ResourceTemplateModel = {
  version?: string;
  resourceType?: 'CodeSystem' | 'ValueSet' | 'ConceptMap' | string;
  url?: string;
  title?: string;
  publisher?: string;
  name?: string;
  language?: string;
  effectivePeriod?: { start?: string; end?: string };
  artifactAuthors?: ContactDetailModel[];
  identifier?: { use?: string; system?: string; value?: string }[];
  property?: { code?: string; uri?: string; description?: string; type?: string }[];
  description?: string;
  date?: string;
  contact?: ContactDetailModel[];
};

export type InputFiles = {
  name: string;
  lastModified: string;
  size?: number;
  type?: string;
  success?: boolean;
  error?: string;
}
export type WorkspaceDetails = {
  templatesJson: TemplateJsonState[];
  templatesMd: TemplateMdItem[];
  packageTemplateJson: string;
  metadatenJson: string;
  changelogsJson: string;
  externalSourcesMd: string;
  fhirConversionNotesMd: string;
  noteOnAuthorMd: string;
  notesOnUpdateCyclesMd: string;
  descriptionGenericMd: string;
  downloadConditionsXml: string;
  inputFiles: InputFiles[];
  mergeRequest?: MergeRequestRef | null;
};
export type CommitResponse = {
  commitId?: string;
  head?: string;
  mergeRequest?: MergeRequestRef;
};

export type CommitChange = {
  action: 'create' | 'update' | 'delete';
  type: 'template' | 'template_markdown' | 'package_template' | 'metadata_package' | 'changelogs' | 'package_markdown' | 'update_index_url_version' | 'download_conditions' | 'input_file';
  fileName: string;
  content?: string | null;
  encoding?: 'text' | 'base64';
};


export type MergeRequestRef = {
  id: number;
  webUrl?: string;
};

// comments
export type CommentType =
  | 'template'
  | 'template_markdown'
  | 'package_template'
  | 'metadata_package'
  | 'changelogs'
  | 'package_markdown'
  | 'update_index_url_version'
  | 'download_conditions'
  ;


export type CommentItem = {
  id: string;
  type: CommentType;
  fileName: string;
  line: number;
  body: string;
  author: string;
  createdAt: string; // date-time
  resolved: boolean;
  threadId: string;
  inline?: boolean;
};

export type CommentsPayload = {
  comments: CommentItem[];
};

export type CommentCreateRequest = {
  repositoryId: string;
  branch: string;
  mrId: string;
  version: string;
  type: CommentType;
  fileName: string;
  line: number;
  body: string;
};

export type CommentCreateResponse = {
  id: string;
};

export type ReplyRequest = {
  repositoryId: string;
  mrId: number;
  threadId: string;
  body: string;
  resolved: boolean;
};
