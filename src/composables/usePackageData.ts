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

import { watch, reactive, computed, toRefs, ref } from "vue";
import type { PackageState, CommitChange, InputFiles, PackageModel } from "../types";
import { useDebounceFn } from "@vueuse/core";
import { validatePackageTemplate } from "../validation/rules";
import {
  createDefaultPackageJson,
  createDefaultMetaJson,
  createDefaultChangelogsJson,
  createDefaultMarkdown,
} from "../utils/defaultTemplateData";

export interface ExternalPackageData {
  pkgJson?: PackageState["pkgJson"];
  metaJson?: PackageState["metaJson"];
  changelogsJson?: PackageState["changelogsJson"];
  markdown?: PackageState["markdown"];
  downloadConditions?: PackageState["downloadConditions"];
  inputFiles?: PackageState["inputFiles"];
}

function clone<T>(x: T): T {
  return x == null ? (x as T) : (JSON.parse(JSON.stringify(x)) as T);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object") {
    if (typeof b !== "object") return false;

    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;

    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;

    for (const k of ak) {
      if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
      if (!deepEqual(ao[k], bo[k])) return false;
    }
    return true;
  }

  return false;
}

function normMd(s: string): string {
  return (s || "").replace(/\r\n/g, "\n");
}

function toPackageTemplateFile(pkg: PackageModel) {
  const dependencies = (pkg.dependencies || "").trim();
  const copyright = (pkg.copyright || "").trim();
  const keywords = Array.isArray(pkg.keywords)
    ? pkg.keywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  return {
    title: pkg.title,
    description: pkg.description,
    author: pkg.author,
    ...(dependencies ? { dependencies } : {}),
    altTitle: pkg.altTitle,
    ...(copyright ? { copyright } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
  };
}

export function usePackage(
  getDataFn: () => ExternalPackageData | null | undefined,
  initialPackageName: string = "",
  initialVersion: string = ""
) {
  const state = reactive<PackageState>({
    pkgJson: createDefaultPackageJson(initialPackageName, initialVersion),
    metaJson: createDefaultMetaJson(initialPackageName, initialVersion),
    changelogsJson: createDefaultChangelogsJson(initialPackageName, initialVersion),
    markdown: createDefaultMarkdown(),
    downloadConditions: "",
    inputFiles: [] as InputFiles[],
  });

  const baseline = ref<ExternalPackageData | null>(null);
  const hasBaseline = computed(() => baseline.value == null);

  let syncChanges: ReturnType<typeof useDebounceFn> = (() => { }) as ReturnType<
    typeof useDebounceFn
  >;

  watch(
    getDataFn,
    (externalData) => {
      if (externalData) {
        if (externalData.pkgJson) {
          state.pkgJson = {
            ...createDefaultPackageJson(initialPackageName, initialVersion),
            ...externalData.pkgJson,
          };
        } else {
          state.pkgJson = createDefaultPackageJson(initialPackageName, initialVersion);
        }

        if (externalData.metaJson) {
          state.metaJson = {
            ...createDefaultMetaJson(state.pkgJson.packagename, state.pkgJson.version),
            ...externalData.metaJson,
          };
        } else {
          state.metaJson = createDefaultMetaJson(
            state.pkgJson.packagename,
            state.pkgJson.version
          );
        }

        if (externalData.changelogsJson) {
          state.changelogsJson = {
            ...createDefaultChangelogsJson(
              state.pkgJson.packagename,
              state.pkgJson.version
            ),
            ...externalData.changelogsJson,
            changes: [...(externalData.changelogsJson.changes || [])],
          };
        } else {
          state.changelogsJson = createDefaultChangelogsJson(
            state.pkgJson.packagename,
            state.pkgJson.version
          );
        }

        if (externalData.markdown) {
          state.markdown = {
            ...createDefaultMarkdown(),
            ...externalData.markdown,
          };
        } else {
          state.markdown = createDefaultMarkdown();
        }

        state.downloadConditions = externalData.downloadConditions ?? "";
        state.inputFiles = externalData.inputFiles ? [...externalData.inputFiles] : [];

        baseline.value = {
          pkgJson: clone(state.pkgJson),
          metaJson: clone(state.metaJson),
          changelogsJson: clone(state.changelogsJson),
          markdown: clone(state.markdown),
          downloadConditions: clone(state.downloadConditions),
          inputFiles: clone(state.inputFiles),
        };

        syncChanges();
      } else {
        state.pkgJson = createDefaultPackageJson(initialPackageName, initialVersion);
        state.metaJson = createDefaultMetaJson(initialPackageName, initialVersion);
        state.changelogsJson = createDefaultChangelogsJson(initialPackageName, initialVersion);
        state.markdown = createDefaultMarkdown();
        state.downloadConditions = "";
        state.inputFiles = [];
        baseline.value = null;
      }
    },
    { immediate: true, deep: true }
  );

  const pkgErrors = computed(() => validatePackageTemplate(state.pkgJson));

  syncChanges = useDebounceFn(() => {
    state.metaJson["package-name"] = state.pkgJson.packagename;
    state.metaJson["package-version"] = state.pkgJson.version;

    if (state.changelogsJson && typeof state.changelogsJson === "object") {
      state.changelogsJson["package-name"] = state.pkgJson.packagename;
      state.changelogsJson["package-version"] = state.pkgJson.version;

      const initial = state.changelogsJson.changes?.[0];

      if (hasBaseline.value && initial?.type === "feature") {
        initial.description = `Initiale Version des FHIR-Packages für ${state.pkgJson.packagename} Version ${state.pkgJson.version}.`;
      }
    }
  }, 300);

  watch(() => state.pkgJson, syncChanges, { deep: true });

  const buildCommitChanges = (
    action: "create" | "update" = "update"
  ): CommitChange[] => {
    const changes: CommitChange[] = [];
    const jsonContent = (data: any) => JSON.stringify(data, null, 2);
    const packageTemplateContent = () => jsonContent(toPackageTemplateFile(state.pkgJson));

    if (action === "create" || !baseline.value) {
      changes.push(
        {
          action,
          type: "package_template",
          fileName: "package.template.json",
          content: packageTemplateContent(),
          encoding: "text",
        },
        {
          action,
          type: "metadata_package",
          fileName: "metadaten.json",
          content: jsonContent(state.metaJson),
          encoding: "text",
        },
        {
          action,
          type: "changelogs",
          fileName: "changelogs.json",
          content: jsonContent(state.changelogsJson),
          encoding: "text",
        },
        {
          action,
          type: "package_markdown",
          fileName: "externalSources.md",
          content: state.markdown.external,
          encoding: "text",
        },
        {
          action,
          type: "package_markdown",
          fileName: "fhirConversionNotes.md",
          content: state.markdown.fhir,
          encoding: "text",
        },
        {
          action,
          type: "package_markdown",
          fileName: "noteOnAuthor.md",
          content: state.markdown.author,
          encoding: "text",
        },
        {
          action,
          type: "package_markdown",
          fileName: "notesOnUpdateCycles.md",
          content: state.markdown.cycles,
          encoding: "text",
        },
        {
          action,
          type: "package_markdown",
          fileName: "descriptionGeneric.md",
          content: state.markdown.generic,
          encoding: "text",
        }
      );

      if (state.downloadConditions) {
        changes.push({
          action,
          type: "download_conditions",
          fileName: "download-conditions.xml",
          content: state.downloadConditions,
          encoding: "text",
        });
      }

      return changes;
    }

    const base = baseline.value;

    if (!deepEqual(toPackageTemplateFile(base.pkgJson as PackageModel), toPackageTemplateFile(state.pkgJson))) {
      changes.push({
        action,
        type: "package_template",
        fileName: "package.template.json",
        content: packageTemplateContent(),
        encoding: "text",
      });
    }

    if (!deepEqual(base.metaJson, state.metaJson)) {
      changes.push({
        action,
        type: "metadata_package",
        fileName: "metadaten.json",
        content: jsonContent(state.metaJson),
        encoding: "text",
      });
    }

    if (!deepEqual(base.changelogsJson, state.changelogsJson)) {
      changes.push({
        action,
        type: "changelogs",
        fileName: "changelogs.json",
        content: jsonContent(state.changelogsJson),
        encoding: "text",
      });
    }

    if (normMd((base.markdown as any)?.external || "") !== normMd(state.markdown.external)) {
      changes.push({
        action,
        type: "package_markdown",
        fileName: "externalSources.md",
        content: state.markdown.external,
        encoding: "text",
      });
    }

    if (normMd((base.markdown as any)?.fhir || "") !== normMd(state.markdown.fhir)) {
      changes.push({
        action,
        type: "package_markdown",
        fileName: "fhirConversionNotes.md",
        content: state.markdown.fhir,
        encoding: "text",
      });
    }

    if (normMd((base.markdown as any)?.author || "") !== normMd(state.markdown.author)) {
      changes.push({
        action,
        type: "package_markdown",
        fileName: "noteOnAuthor.md",
        content: state.markdown.author,
        encoding: "text",
      });
    }

    if (normMd((base.markdown as any)?.cycles || "") !== normMd(state.markdown.cycles)) {
      changes.push({
        action,
        type: "package_markdown",
        fileName: "notesOnUpdateCycles.md",
        content: state.markdown.cycles,
        encoding: "text",
      });
    }

    if (normMd((base.markdown as any)?.generic || "") !== normMd(state.markdown.generic)) {
      changes.push({
        action,
        type: "package_markdown",
        fileName: "descriptionGeneric.md",
        content: state.markdown.generic,
        encoding: "text",
      });
    }

    const baseDownloadConditions = base.downloadConditions ?? "";
    const currentDownloadConditions = state.downloadConditions ?? "";

    const hadDownloadConditions = baseDownloadConditions.trim().length > 0;
    const hasDownloadConditions = currentDownloadConditions.trim().length > 0;

    if (baseDownloadConditions !== currentDownloadConditions) {
      let actionForDownloadConditions: "create" | "update" | "delete" | null = null;

      if (!hadDownloadConditions && hasDownloadConditions) {
        actionForDownloadConditions = "create";
      } else if (hadDownloadConditions && hasDownloadConditions) {
        actionForDownloadConditions = "update";
      } else if (hadDownloadConditions && !hasDownloadConditions) {
        actionForDownloadConditions = "delete";
      }

      if (actionForDownloadConditions) {
        changes.push({
          action: actionForDownloadConditions,
          type: "download_conditions",
          fileName: "download-conditions.xml",
          content: actionForDownloadConditions === "delete" ? null : currentDownloadConditions,
          encoding: "text",
        });
      }
    }

    return changes;
  };

  return {
    ...toRefs(state),
    pkgErrors,
    buildCommitChanges,
  };
}
