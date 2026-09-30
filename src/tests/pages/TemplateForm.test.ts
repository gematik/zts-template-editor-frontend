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

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, computed, unref } from "vue";
import TemplateForm from "../../pages/TemplateForm.vue";
import { REVIEW_APPROVED_EVENT } from "../../utils/events";
declare const require: any;

const routeGuards = vi.hoisted(() => ({
  update: [] as Array<(to: any, from: any, next: (v?: any) => void) => void>,
  leave: [] as Array<(to: any, from: any, next: (v?: any) => void) => void>,
}));

vi.mock("vue-router", async () => {
  const actual = await vi.importActual<typeof import("vue-router")>("vue-router");
  return {
    ...actual,
    onBeforeRouteUpdate: (cb: any) => routeGuards.update.push(cb),
    onBeforeRouteLeave: (cb: any) => routeGuards.leave.push(cb),
  };
});

// ---------- naive-ui stubs ----------
let lastDialogOpts: any | null = null;
let lastErrorDialogOpts: any | null = null;

vi.mock("naive-ui", () => {
  const vue = require("vue") as typeof import("vue");
  const { defineComponent, h } = vue;

  const BasicStub = defineComponent({
    name: "BasicStub",
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });

  const NButton = defineComponent({
    name: "NButton",
    props: {
      disabled: Boolean,
      loading: Boolean,
      type: String,
      size: String,
      attrType: String,
    },
    emits: ["click"],
    setup(props, { emit, slots, attrs }) {
      return () =>
        h(
          "button",
          {
            ...attrs,
            disabled: props.disabled,
            "data-loading": props.loading ? "1" : "0",
            onClick: () => emit("click"),
          },
          slots.default?.()
        );
    },
  });

  const NAlert = defineComponent({
    name: "NAlert",
    props: {
      type: String,
      title: String,
      showIcon: Boolean,
      closable: Boolean,
    },
    emits: ["close"],
    setup(_, { emit, slots }) {
      return () =>
        h("div", { "data-alert": "1" }, [
          slots.header?.(),
          slots.default?.(),
          h("button", { onClick: () => emit("close") }, "x"),
        ]);
    },
  });

  const NTabs = defineComponent({
    name: "NTabs",
    props: { value: String },
    emits: ["update:value"],
    setup(props, { emit, slots }) {
      return () =>
        h("div", { "data-tabs": props.value ?? "" }, [
          slots.default?.(),
          h(
            "button",
            {
              "data-test": "tabs-set-web",
              onClick: () => emit("update:value", "Webcontent"),
            },
            "set-web"
          ),
          h(
            "button",
            {
              "data-test": "tabs-set-pkg",
              onClick: () => emit("update:value", "FHIR-Templates"),
            },
            "set-pkg"
          ),
        ]);
    },
  });

  const NTabPane = defineComponent({
    name: "NTabPane",
    props: { name: String, title: String },
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });

  const NSelect = defineComponent({
    name: "NSelect",
    props: {
      options: { type: Array, default: () => [] },
      placeholder: { type: String, default: "" },
      loading: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      value: { type: [String, Number, Object, null], default: null },
    },
    emits: ["update:value"],
    setup(props, { emit }) {
      return () =>
        h(
          "select",
          {
            id: "previous-version",
            value: props.value,
            onChange: (e: any) => emit("update:value", e.target.value),
          },
          [
            h("option", { value: "" }, props.placeholder || ""),
            ...(props.options as any[]).map((opt) =>
              h("option", { value: opt.value }, opt.label)
            ),
          ]
        );
    },
  });

  const NTooltip = defineComponent({
    name: "NTooltip",
    props: { trigger: String },
    setup(_, { slots }) {
      return () => h("div", { class: "n-tooltip" }, [
        slots.trigger?.(),
        slots.default?.(),
      ]);
    },
  });

  const useDialog = () => {
    return {
      warning: vi.fn((opts: any) => {
        lastDialogOpts = opts;
        return undefined;
      }),
      error: vi.fn((opts: any) => {
        lastErrorDialogOpts = opts;
        return undefined;
      }),
    };
  };

  return {
    NButton,
    NSpin: BasicStub,
    NSpace: BasicStub,
    NSelect,
    NAlert,
    NCard: BasicStub,
    NTabs,
    NTabPane,
    NCollapse: BasicStub,
    NCollapseItem: BasicStub,
    NAffix: BasicStub,
    NTooltip,
    useDialog,
  };
});

// ---- API mock (Merge) ----
const mockApproveAndMergeReview = vi.hoisted(() =>
  vi.fn<(...args: any[]) => any>()
);

vi.mock("../../api/workspaces", () => ({
  approveAndMergeReview: mockApproveAndMergeReview,
}));

type CommitChange = {
  action: "create" | "update" | "delete";
  type: "template_markdown" | string;
  fileName: string;
  content?: string;
  encoding: "text" | string;
};

type TmplMdState = {
  version: string;
  canonicalUrl: string;
  originalVersion?: string;
  originalCanonicalUrl?: string;
  markdown?: string;
};

type WorkspaceDetails = {
  templatesMd?: Array<{ version?: string; canonicalUrl?: string; markdown?: string }>;
  templatesJson?: Array<{ name?: string; json?: string }>;
  mergeRequest?: { id?: number | string };
};

let packageFormEmitsValid: boolean | null = true;

let mockRouter: { push: ReturnType<typeof vi.fn> };
let mockProjectId: any;
let mockPackageName: any;
let mockVersion: any;
let mockIsLoggedIn: any;
let mockLoadingDetails: any;
let mockSaving: any;
let mockStatusMessage: any;
let mockCanEdit: any;
let mockIsVersionReleased: any;
let mockCanApprove: any;
let mockSelectedBranch: any;
let mockPerformSave: ReturnType<typeof vi.fn>;
let mockStartReviewWithoutCommit: ReturnType<typeof vi.fn>;
let mockTab: any;
let mockHasDetails: any;
let mockLoadedPackageData: any;
let mockWorkspaceDetails: any;
let mockTemplateMarkdownStates: any;
let mockTemplateJsonStates: any;
let mockPreviousVersions: any;
let mockPreviousVersionSelected: any;
let mockPreviousVersionState: any;
let mockPreviousVersionWarnings: any;
let mockDefaultBranch: any;
let mockAddMarkdownTemplate: ReturnType<typeof vi.fn>;
let mockRemoveMarkdownTemplate: ReturnType<typeof vi.fn>;
let mockLimitMd: ReturnType<typeof vi.fn>;
let mockPkgJson: any;
let mockMetaJson: any;
let mockChangelogsJson: any;
let mockMarkdown: any;
let mockBuildCommitChanges: ReturnType<typeof vi.fn>;
let mockLoadDetails: ReturnType<typeof vi.fn>;

type Mode = "create" | "createFrom" | "edit";

vi.mock("../../composables/useTemplatesManagement", () => {
  return {
    useTemplatesManagement: (modeArg: "create" | "createFrom" | "edit") => {
      const currentMode = computed<Mode>(() => (unref(modeArg) ?? "edit") as Mode);

      return {
        mode: currentMode,
        router: mockRouter,
        projectId: mockProjectId,
        packageName: mockPackageName,
        version: mockVersion,
        defaultBranch: mockDefaultBranch,
        previousVersions: mockPreviousVersions,
        previousVersionSelected: mockPreviousVersionSelected,
        previousVersionState: mockPreviousVersionState,
        previousVersionWarnings: mockPreviousVersionWarnings,
        loadingDetails: mockLoadingDetails,
        saving: mockSaving,
        statusMessage: mockStatusMessage,
        canEdit: mockCanEdit,
        isVersionReleased: mockIsVersionReleased,
        canApprove: mockCanApprove,
        isLoggedIn: mockIsLoggedIn,
        selectedBranch: mockSelectedBranch,
        performSave: mockPerformSave,
        startReviewWithoutCommit: mockStartReviewWithoutCommit,
        tab: mockTab,
        hasDetails: mockHasDetails,
        loadedPackageData: mockLoadedPackageData,
        workspaceDetails: mockWorkspaceDetails,
        templateMarkdownStates: mockTemplateMarkdownStates,
        templateJsonStates: mockTemplateJsonStates,
        addMarkdownTemplate: mockAddMarkdownTemplate,
        removeMarkdownTemplate: mockRemoveMarkdownTemplate,
        limitMd: mockLimitMd,
        loadDetails: mockLoadDetails,
      };
    },
  };
});

vi.mock("../../composables/usePackageData", () => {
  return {
    usePackage: () => ({
      pkgJson: mockPkgJson,
      metaJson: mockMetaJson,
      changelogsJson: mockChangelogsJson,
      markdown: mockMarkdown,
      downloadConditions: ref(""),
      inputFiles: ref([]),
      buildCommitChanges: mockBuildCommitChanges,
    }),
  };
});

vi.mock("../../composables/useStatusMessage", () => {
  return { useStatusMessage: vi.fn() };
});

vi.mock("../../composables/useComments", () => {
  return {
    useComments: (_opts: any) => {
      return {
        items: ref([]),
        addComment: vi.fn().mockResolvedValue(undefined),
        reply: vi.fn().mockResolvedValue(undefined),
      };
    },
  };
});

const PackageFormStub = defineComponent({
  name: "PackageForm",
  emits: ["update:modelValue", "valid"],
  setup(_, { emit }) {
    if (packageFormEmitsValid !== null) emit("valid", packageFormEmitsValid);
    return () => h("div", { "data-test": "package-form" });
  },
});

const WebsiteFormStub = defineComponent({
  name: "WebsiteForm",
  props: {
    metaJson: String,
    changelogsJson: String,
    markdown: Object,
    templateStates: Array,
    canEdit: Boolean,
    mode: String,
    packageName: String,
    packageVersion: String,
  },
  emits: [
    "update:meta-json",
    "update:changelogs-json",
    "update:markdown",
    "update:template-markdown",
    "remove-template-markdown",
    "add-template-markdown",
  ],
  setup() {
    return () => h("div", { "data-test": "website-form" });
  },
});

const DownloadConditionsEditorStub = defineComponent({
  name: "DownloadConditionsEditor",
  emits: ["update:conditions-value"],
  setup() {
    return () => h("div", { "data-test": "download-conditions-editor" });
  },
});

const FileUploaderStub = defineComponent({
  name: "FileUploader",
  emits: ["upload-success", "update:status-message"],
  setup() {
    return () => h("div", { "data-test": "file-uploader" });
  },
});

const ResourceTemplateFormStub = defineComponent({
  name: "ResourceTemplateForm",
  emits: ["update:modelValue", "valid"],
  setup() {
    return () => h("div", { "data-test": "resource-template-form" });
  },
});


function mountPage(mode: "create" | "createFrom" | "edit" = "edit") {
  return mount(TemplateForm as any, {
    props: { mode },
    global: {
      stubs: {
        PackageForm: PackageFormStub,
        WebsiteForm: WebsiteFormStub,
        ResourceTemplateForm: ResourceTemplateFormStub,
        DownloadConditionsEditor: DownloadConditionsEditorStub,
        FileUploader: FileUploaderStub,
      },
    },
  });
}


async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}


beforeEach(() => {
  routeGuards.update.length = 0;
  routeGuards.leave.length = 0;

  packageFormEmitsValid = true;
  lastDialogOpts = null;
  lastErrorDialogOpts = null;

  mockApproveAndMergeReview.mockReset();
  mockApproveAndMergeReview.mockResolvedValue("ok");
  mockLoadDetails = vi.fn().mockResolvedValue(undefined);

  mockRouter = { push: vi.fn().mockResolvedValue(undefined) };

  mockProjectId = ref("123");
  mockPackageName = ref("mypkg");
  mockVersion = ref("1.0.0");
  mockIsLoggedIn = ref(true);
  mockLoadingDetails = ref(false);
  mockSaving = ref(false);
  mockStatusMessage = ref({ message: null, type: "info" });
  mockCanEdit = ref(true);
  mockIsVersionReleased = ref(true);
  mockCanApprove = ref(true);
  mockSelectedBranch = ref("main");
  mockPerformSave = vi.fn();
  mockStartReviewWithoutCommit = vi.fn();

  mockTab = ref<"FHIR-Templates" | "Webcontent" | "Downloadbedingungen" | "Upload Inputdateien">("FHIR-Templates");
  mockHasDetails = ref(true);

  mockLoadedPackageData = ref({ pkgJson: { version: "1.0.0", packagename: "mypkg" } });
  mockWorkspaceDetails = ref<WorkspaceDetails | null>(null);

  mockTemplateMarkdownStates = ref<TmplMdState[]>([]);
  mockTemplateJsonStates = ref<any[]>([]);
  mockAddMarkdownTemplate = vi.fn();
  mockRemoveMarkdownTemplate = vi.fn();
  mockLimitMd = vi.fn((key: string, v: string) => `LIM(${key})::${v}`);

  mockPreviousVersions = ref([]);
  mockPreviousVersionSelected = ref(null);
  mockPreviousVersionState = ref('loaded');
  mockPreviousVersionWarnings = ref(null);
  mockDefaultBranch = ref({ branch: 'dev' });

  mockPkgJson = ref({ packagename: "mypkg", version: "1.0.0" });
  mockMetaJson = ref({ title: "x" });
  mockChangelogsJson = ref({ entries: [] });
  mockMarkdown = ref({ readme: "" });

  mockBuildCommitChanges = vi.fn((_action: "create" | "update") => [
    {
      action: "update",
      type: "package",
      fileName: "package.json",
      content: "{}",
      encoding: "text",
    },
  ]);
});

describe("TemplateForm (updated)", () => {
  it("zeigt Login-Hinweis wenn nicht eingeloggt", async () => {
    mockIsLoggedIn.value = false;

    const wrapper = mountPage("edit");
    await nextTick();

    expect(wrapper.text()).toContain("Bitte melden Sie sich an, um Templates zu bearbeiten.");
  });

  it("Back Button: klick -> router.push({name:'projects'})", async () => {
    const wrapper = mountPage("edit");
    await nextTick();

    const backButton = wrapper.findAll("button")[0];
    expect(backButton).toBeDefined();
    expect(backButton?.exists()).toBe(true);

    await backButton?.trigger("click");
    expect(mockRouter.push).toHaveBeenCalledWith({ name: "projects" });
  });

  it("createFrom: 'Lade Daten' navigiert zu newVersionFrom mit ausgewählter Version", async () => {
    mockProjectId.value = "789";
    mockPackageName.value = "existing.package.de";
    mockVersion.value = "3.1.0";
    mockPreviousVersions.value = [{ version: "3.2.1" }, { version: "3.1.0" }];
    mockPreviousVersionSelected.value = "3.2.1";

    const wrapper = mountPage("createFrom");
    await nextTick();

    const loadBtn = wrapper.find("#load-previous-version-btn");
    expect(loadBtn.exists()).toBe(true);
    expect((loadBtn.element as HTMLButtonElement).disabled).toBe(false);

    await loadBtn.trigger("click");
    await nextTick();

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: "newVersionFrom",
      params: {
        projectId: "789",
        packageName: "existing.package.de",
        version: "3.2.1",
        workspace: "dev",
      },
    });
  });

  it("createFrom: 'Lade Daten' disabled wenn Daten bereits geladen (zeigt 'Daten geladen')", async () => {
    mockVersion.value = "3.2.1";
    mockPreviousVersions.value = [{ version: "3.2.1" }];
    mockPreviousVersionSelected.value = "3.2.1";

    const wrapper = mountPage("createFrom");
    await nextTick();

    const btn = wrapper.find("#load-previous-version-btn");
    expect(btn.exists()).toBe(true);
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    expect(btn.text()).toContain("Daten geladen");
  });

  it("createFrom: 'Zurücksetzen' navigiert zu newVersion", async () => {
    const wrapper = mountPage("createFrom");
    await nextTick();

    const resetBtn = wrapper.find("#reset-previous-version-btn");
    expect(resetBtn.exists()).toBe(true);
    expect((resetBtn.element as HTMLButtonElement).disabled).toBe(false);

    await resetBtn.trigger("click");
    await nextTick();

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: "newVersion",
      params: {
        projectId: "123",
        packageName: "mypkg",
      },
      state: { mode: "create" },
    });
    expect(mockPreviousVersionSelected.value).toBeNull();
  });

  it("Version Select: Warnung sichtbar wenn previousVersionWarnings gesetzt", async () => {
    mockPreviousVersionWarnings.value = {
      version: "3.2.1",
      warnings: ["Warnung 1", "Warnung 2"],
    };

    const wrapper = mountPage("createFrom");
    await nextTick();
    await flush();

    const alert = wrapper.find('#previous-version-warnings');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Warnung 1");
    expect(alert.text()).toContain("Warnung 2");
  });

  it("Version Select: Warnung nicht sichtbar wenn previousVersionWarnings null", async () => {
    mockPreviousVersionWarnings.value = null;

    const wrapper = mountPage("createFrom");
    await nextTick();

    const alert = wrapper.find('#previous-version-warnings');
    expect(alert.exists()).toBe(false);
  });

  it("Version Select: Richtige elemente im Select für vorherige Versionen", async () => {
    mockPreviousVersions.value = [{ version: "3.2.1" }, { version: "3.1.0" }];

    const wrapper = mountPage("create");
    await nextTick();
    await flush();

    const select = wrapper.find("#previous-version-section");
    expect(select.exists()).toBe(true);
    expect(select.text()).toContain("3.2.1");
    expect(select.text()).toContain("3.1.0");
  });

  it("Alert close: setzt statusMessage.message auf null", async () => {
    mockStatusMessage.value = { message: "Hallo", type: "info" };
    mockIsVersionReleased.value = false;

    const wrapper = mountPage("edit");
    await nextTick();

    const alert = wrapper.find('[data-alert="1"]');
    expect(alert.exists()).toBe(true);

    const closeButton = alert.find("button");
    await closeButton.trigger("click");

    expect(mockStatusMessage.value.message).toBeNull();
  });

  it("released guards: rendert robust wenn isVersionReleased nicht gesetzt ist", async () => {
    mockIsVersionReleased = undefined as any;
    mockStatusMessage.value = { message: null, type: "info" };

    const wrapper = mountPage("edit");
    await nextTick();

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("#create-from-current-version-btn").exists()).toBe(false);
  });

  it("released warning: zeigt Headertext + CTA wenn edit, released und canEdit=true", async () => {
    mockIsVersionReleased.value = true;
    mockCanEdit.value = true;
    mockVersion.value = "4.2.0";
    mockDefaultBranch.value = { branch: "dev" };

    const wrapper = mountPage("edit");
    await flush();

    const warning = wrapper.find("#released-terminology-warning");
    expect(warning.exists()).toBe(true);
    expect(wrapper.find("#create-from-current-version-btn").exists()).toBe(true);
  });


  it("Save Button: enabled wenn edit + keine Änderungen und kein MR", async () => {
    mockBuildCommitChanges = vi.fn(() => []);
    mockWorkspaceDetails.value = { templatesMd: [] };
    mockTemplateMarkdownStates.value = [];
    mockHasDetails.value = true;
    mockIsLoggedIn.value = true;

    const wrapper = mountPage("edit");
    await nextTick();
    await nextTick();

    const allButtons = wrapper.findAllComponents({ name: "NButton" });
    const saveButton = allButtons.find(b => b.text().includes("Speichern"));
    expect(saveButton).toBeDefined();

    if (saveButton) {
      expect(saveButton.element.hasAttribute("disabled")).toBe(false);
    }
  });
  it("Save Button: enabled wenn edit + Änderungen vorhanden", async () => {
    mockWorkspaceDetails.value = { templatesMd: [] };
    mockTemplateMarkdownStates.value = [];

    const wrapper = mountPage("edit");
    await nextTick();

    const saveBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().includes("Speichern")
    );
    expect(saveBtn).toBeDefined();
    expect(saveBtn?.props("disabled")).toBe(false);
  });

  it("createFrom -> create: setzt Baseline neu und markiert keine ungespeicherten Änderungen", async () => {
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("createFrom");
    await nextTick();
    await nextTick();

    expect((wrapper.vm as any).hasUiChanges).toBe(false);

    // Simulate browser back: mode changes first, data catches up afterwards.
    await wrapper.setProps({ mode: "create" });
    await nextTick();

    mockWorkspaceDetails.value = null;
    mockTemplateMarkdownStates.value = [];
    await nextTick();
    await nextTick();

    expect((wrapper.vm as any).hasUiChanges).toBe(false);

    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    expect((wrapper.vm as any).confirmDiscardChanges()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("saveVersion: guard -> stoppt wenn canEdit=false oder saving=true", async () => {
    mockCanEdit.value = false;
    const wrapper1 = mountPage("edit");
    await (wrapper1.vm as any).saveVersion();
    expect(mockPerformSave).not.toHaveBeenCalled();

    mockCanEdit.value = true;
    mockSaving.value = true;
    const wrapper2 = mountPage("edit");
    await (wrapper2.vm as any).saveVersion();
    expect(mockPerformSave).not.toHaveBeenCalled();
  });

  it("saveVersion: edit + hasMr=true => kein Dialog, performSave(..., createMr=false)", async () => {
    mockWorkspaceDetails.value = {
      mergeRequest: { id: 99 },
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("edit");
    await (wrapper.vm as any).saveVersion();

    expect(lastDialogOpts).toBeNull();
    expect(mockPerformSave).toHaveBeenCalledTimes(1);

    const [allChanges, currentPkgVersion, createMr] = mockPerformSave.mock.calls[0] as [
      CommitChange[],
      string,
      boolean
    ];

    expect(currentPkgVersion).toBe("1.0.0");
    expect(createMr).toBe(false);
    expect(allChanges.length).toBeGreaterThan(0);
  });

  it("saveVersion: edit + hasMr=false => kein Dialog, performSave(..., createMr=true)", async () => {
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("edit");
    await (wrapper.vm as any).saveVersion();

    expect(lastDialogOpts).toBeNull();
    expect(mockPerformSave).toHaveBeenCalledTimes(1);
    const [, , createMr] = mockPerformSave.mock.calls[0] as [any, any, boolean];
    expect(createMr).toBe(true);
  });


  it("saveVersion: edit + hasMr=false + Dialog X => CANCEL => kein Save", async () => {
    mockIsVersionReleased.value = false;
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("edit");
    const p = (wrapper.vm as any).saveVersion();
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onClose?.();

    await p;
    expect(mockPerformSave).not.toHaveBeenCalled();
  });

  it("saveVersion: edit + hasMr=false + Dialog negative => save ohne MR", async () => {
    mockIsVersionReleased.value = false;
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("edit");
    const p = (wrapper.vm as any).saveVersion();
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onNegativeClick?.();

    await p;
    expect(mockPerformSave).toHaveBeenCalledTimes(1);
    const [, , createMr] = mockPerformSave.mock.calls[0] as [any, any, boolean];
    expect(createMr).toBe(false);
  });

  it("saveVersion: edit + hasMr=false + Dialog positive => save mit MR", async () => {
    mockIsVersionReleased.value = false;
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x.md", markdown: "new" }];

    const wrapper = mountPage("edit");
    const p = (wrapper.vm as any).saveVersion();
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onPositiveClick?.();

    await p;
    expect(mockPerformSave).toHaveBeenCalledTimes(1);
    const [, , createMr] = mockPerformSave.mock.calls[0] as [any, any, boolean];
    expect(createMr).toBe(true);
  });

  it("saveVersion: edit + keine Änderungen + Dialog positive => startet MR ohne Commit", async () => {
    mockBuildCommitChanges = vi.fn(() => []);
    mockWorkspaceDetails.value = {
      templatesMd: [],
    };
    mockTemplateMarkdownStates.value = [];

    const wrapper = mountPage("edit");
    const p = (wrapper.vm as any).saveVersion();
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onPositiveClick?.();

    await p;
    expect(mockStartReviewWithoutCommit).toHaveBeenCalledTimes(1);
    expect(mockStartReviewWithoutCommit).toHaveBeenCalledWith("1.0.0");
    expect(mockPerformSave).not.toHaveBeenCalled();
  });

  it("saveVersion: edit + keine Änderungen + Dialog X => CANCEL => kein Save", async () => {
    mockBuildCommitChanges = vi.fn(() => []);
    mockWorkspaceDetails.value = {
      templatesMd: [],
    };
    mockTemplateMarkdownStates.value = [];

    const wrapper = mountPage("edit");
    const p = (wrapper.vm as any).saveVersion();
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onClose?.();

    await p;
    expect(mockStartReviewWithoutCommit).not.toHaveBeenCalled();
    expect(mockPerformSave).not.toHaveBeenCalled();
  });

  it("saveVersion: create-mode (valid=true) + hasMr=true => kein Save", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 1 }, templatesMd: [] };

    const wrapper = mountPage("create");
    (wrapper.vm as any).validation.pkgValid = true;

    await (wrapper.vm as any).saveVersion();

    expect(lastDialogOpts).toBeNull();
    expect(mockPerformSave).not.toHaveBeenCalled();
  });

  it("canWriteComments: edit + mrId => true", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 99 } };

    const wrapper = mountPage("edit");
    await nextTick();

    expect((wrapper.vm as any).canWriteComments).toBe(true);
  });

  it("canWriteComments: edit + kein mrId => false", async () => {
    mockWorkspaceDetails.value = null;

    const wrapper = mountPage("edit");
    await nextTick();

    expect((wrapper.vm as any).canWriteComments).toBe(false);
  });

  it("Merge Button: sichtbar nur wenn edit + hasMr", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 1 }, templatesMd: [] };

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();

    const wrapper2 = mountPage("create");
    await nextTick();
    const mergeBtn2 = wrapper2.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn2).toBeUndefined();
  });

  it("Merge Button: disabled wenn saving=true", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 1 }, templatesMd: [] };
    mockSaving.value = true;

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();
    expect(mergeBtn?.props("disabled")).toBe(true);
  });

  it("mergeMr: Klick -> Dialog, Cancel -> kein API call", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 7 }, templatesMd: [] };
    mockLoadedPackageData.value = { pkgJson: { version: "1.0.0", packagename: "mypkg" } };

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();

    await mergeBtn?.trigger("click");
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();

    lastDialogOpts.onNegativeClick?.();
    await flush();

    expect(mockApproveAndMergeReview).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("mergeMr: Success -> approveAndMergeReview called + router.push('/projects')", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 6 }, templatesMd: [] };
    mockProjectId.value = "12505";
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();

    await mergeBtn?.trigger("click");
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();

    lastDialogOpts.onPositiveClick?.();
    await flush();

    expect(mockApproveAndMergeReview).toHaveBeenCalledTimes(1);
    expect(mockApproveAndMergeReview.mock.calls[0]![0]).toEqual({
      projectId: "12505",
      mrId: "6",
    });

    expect(dispatchSpy).toHaveBeenCalled();
    const dispatched = dispatchSpy.mock.calls.find(
      ([evt]) => evt instanceof CustomEvent && evt.type === REVIEW_APPROVED_EVENT
    )?.[0] as CustomEvent | undefined;
    expect(dispatched).toBeDefined();
    expect(dispatched?.detail).toEqual({
      projectId: 12505,
      mrId: 6,
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/projects");
  });

  it("mergeMr: Fehler 500 -> zeigt Rechte-Fehlermeldung + zeigt Error-Dialog", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 6 }, templatesMd: [] };
    mockProjectId.value = "12505";

    mockApproveAndMergeReview.mockRejectedValue({
      status: 500,
      message: "HTTP 500 Internal Server Error – nope",
    });

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();

    await mergeBtn?.trigger("click");
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onPositiveClick?.();
    await flush();

    expect(mockRouter.push).not.toHaveBeenCalled();

    expect(mockStatusMessage.value.type).toBe("error");
    expect(mockStatusMessage.value.message).toMatch(/GitLab-Rechte/);

    expect(lastErrorDialogOpts).toBeTruthy();
    expect(String(lastErrorDialogOpts.content)).toMatch(/GitLab-Rechte/);
  });

  it("mergeMr: anderer Fehler -> zeigt Error.message + zeigt Error-Dialog", async () => {
    mockWorkspaceDetails.value = { mergeRequest: { id: 6 }, templatesMd: [] };
    mockProjectId.value = "12505";

    mockApproveAndMergeReview.mockRejectedValue(new Error("Merge kaputt"));

    const wrapper = mountPage("edit");
    await nextTick();

    const mergeBtn = wrapper.findAllComponents({ name: "NButton" }).find(
      (b) => b.text().trim() === "Genehmigen"
    );
    expect(mergeBtn).toBeDefined();

    await mergeBtn?.trigger("click");
    await nextTick();

    expect(lastDialogOpts).toBeTruthy();
    lastDialogOpts.onPositiveClick?.();
    await flush();

    expect(mockRouter.push).not.toHaveBeenCalled();

    expect(mockStatusMessage.value.type).toBe("error");
    expect(mockStatusMessage.value.message).toMatch(/Merge kaputt/);

    expect(lastErrorDialogOpts).toBeTruthy();
    expect(String(lastErrorDialogOpts.content)).toMatch(/Merge kaputt/);
  });

  it("pkgJsonString: fehlende Package-Felder werden beim Setzen auf leer zurückgesetzt", async () => {
    const wrapper = mountPage("edit");
    await nextTick();

    (wrapper.vm as any).pkgJson.dependencies = "alt";
    (wrapper.vm as any).pkgJson.copyright = "alt";
    (wrapper.vm as any).pkgJson.keywords = ["OPS"];

    (wrapper.vm as any).pkgJsonString = JSON.stringify({
      title: "OPS",
      description: "OPS",
      author: "OPS",
      altTitle: "OPS",
    });

    expect((wrapper.vm as any).pkgJson.dependencies).toBe("");
    expect((wrapper.vm as any).pkgJson.copyright).toBe("");
    expect((wrapper.vm as any).pkgJson.keywords).toEqual([]);
  });

  it("pkgJsonString/metaJsonString: fangen JSON-Parsefehler ab", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const wrapper = mountPage("edit");
    await nextTick();

    (wrapper.vm as any).pkgJsonString = "{bad";
    (wrapper.vm as any).metaJsonString = "{bad";

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls.some(([msg]) => String(msg).includes("Error parsing package JSON:"))).toBe(true);
    expect(errorSpy.mock.calls.some(([msg]) => String(msg).includes("Error parsing metadata JSON:"))).toBe(true);

    errorSpy.mockRestore();
  });

  it("watcher branches: create setzt signature und createFrom+loading setzt null", async () => {
    // create branch is hit on a subsequent watcher run after initial mode bootstrap.
    const wrapperCreate = mountPage("create");
    await nextTick();
    mockVersion.value = "1.0.1";
    await nextTick();
    expect((wrapperCreate.vm as any).initialUiSignature).not.toBeNull();

    // createFrom+loading branch is hit when loading toggles true after initial mode bootstrap.
    mockLoadingDetails.value = false;
    const wrapper = mountPage("createFrom");
    await nextTick();

    mockLoadingDetails.value = true;
    await nextTick();

    expect((wrapper.vm as any).initialUiSignature).toBeNull();

    mockLoadingDetails.value = false;
    await nextTick();
    expect((wrapper.vm as any).initialUiSignature).not.toBeNull();
  });

  it("route guards: confirmDiscardChanges steuert next() in update/leave", async () => {
    mockWorkspaceDetails.value = {
      templatesMd: [{ version: "1.0.0", canonicalUrl: "x", markdown: "old" }],
    };
    mockTemplateMarkdownStates.value = [{ version: "1.0.0", canonicalUrl: "x", markdown: "new" }];

    mountPage("edit");
    await flush();

    expect(routeGuards.update.length).toBeGreaterThan(0);
    expect(routeGuards.leave.length).toBeGreaterThan(0);

    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const nextUpdate = vi.fn();
    routeGuards.update[0]!({ fullPath: "/a" }, { fullPath: "/b" }, nextUpdate);
    expect(nextUpdate).toHaveBeenCalledWith(false);

    const nextLeave = vi.fn();
    routeGuards.leave[0]!({}, {}, nextLeave);
    expect(nextLeave).toHaveBeenCalledWith(false);

    confirmSpy.mockReturnValue(true);
    const nextUpdateTrue = vi.fn();
    routeGuards.update[0]!({ fullPath: "/x" }, { fullPath: "/y" }, nextUpdateTrue);
    expect(nextUpdateTrue).toHaveBeenCalledWith();

    const nextLeaveTrue = vi.fn();
    routeGuards.leave[0]!({}, {}, nextLeaveTrue);
    expect(nextLeaveTrue).toHaveBeenCalledWith();

    const nextSamePath = vi.fn();
    routeGuards.update[0]!({ fullPath: "/same" }, { fullPath: "/same" }, nextSamePath);
    expect(nextSamePath).toHaveBeenCalledWith();

    confirmSpy.mockRestore();
  });

  it("navigateToAlternateVersion: main->feature und feature->default", async () => {
    mockVersion.value = "1.2.3";
    mockDefaultBranch.value = { branch: "main" };
    mockSelectedBranch.value = "main";
    mockIsVersionReleased.value = true;

    const wrapper = mountPage("edit");
    await nextTick();

    await (wrapper.vm as any).navigateToAlternateVersion();
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: "versionDetails",
      params: {
        projectId: "123",
        packageName: "mypkg",
        version: "1.2.3",
        workspace: "feature/1.2.3",
      },
    });

    mockRouter.push.mockClear();
    mockSelectedBranch.value = "feature/1.2.3";
    await (wrapper.vm as any).navigateToAlternateVersion();
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: "versionDetails",
      params: {
        projectId: "123",
        packageName: "mypkg",
        version: "1.2.3",
        workspace: "main",
      },
    });
  });

  it("edit: navigateToCreateFromCurrentVersion nutzt die aktuelle Version als Basis", async () => {
    mockVersion.value = "4.2.0";
    mockDefaultBranch.value = { branch: "dev" };
    mockIsVersionReleased.value = true;
    mockCanEdit.value = true;

    const wrapper = mountPage("edit");
    await flush();

    mockRouter.push.mockClear();
    await (wrapper.vm as any).navigateToCreateFromCurrentVersion();
    await flush();

    expect(mockPreviousVersionSelected.value).toBe("4.2.0");
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: "newVersionFrom",
      params: {
        projectId: "123",
        packageName: "mypkg",
        version: "4.2.0",
        workspace: "dev",
      },
    });
  });



  it("edit: pendingChanges enthält geänderte ResourceTemplate-JSONs", async () => {
    mockWorkspaceDetails.value = {
      templatesJson: [
        {
          name: "CodeSystem-example.json",
          json: JSON.stringify({ resourceType: "CodeSystem", url: "https://old.example" }, null, 2),
        },
      ],
    };

    mockTemplateJsonStates.value = [
      {
        name: "CodeSystem-example.json",
        json: JSON.stringify({ resourceType: "CodeSystem", url: "https://new.example" }, null, 2),
        jsonValid: true,
      },
    ];

    mockBuildCommitChanges.mockReturnValue([]);

    const wrapper = mountPage("edit");
    await flush();

    const pendingChanges = (wrapper.vm as any).pendingChanges as CommitChange[];

    expect(pendingChanges).toEqual([
      expect.objectContaining({
        action: "update",
        type: "template",
        fileName: "CodeSystem-example.json",
        encoding: "text",
      }),
    ]);
    expect(JSON.parse(pendingChanges[0]!.content ?? "{}")).toEqual({
      resourceType: "CodeSystem",
      url: "https://new.example",
    });
  });

  it("edit: ResourceTemplate-Validität sperrt Formular", async () => {
    mockTemplateJsonStates.value = [
      { name: "broken.json", json: "{}", jsonValid: false },
    ];

    const wrapper = mountPage("edit");
    await flush();

    expect((wrapper.vm as any).isFormValid).toBe(false);
  });

  it("createFrom: pendingChanges enthält unveränderte templatesMd als create", async () => {
    mockWorkspaceDetails.value = {
      templatesMd: [
        {
          version: "1.0.0",
          canonicalUrl: "x.md",
          markdown: "same content",
        },
      ],
    };

    mockTemplateMarkdownStates.value = [
      {
        version: "1.0.0",
        canonicalUrl: "x.md",
        markdown: "same content",
      },
    ];

    const wrapper = mountPage("createFrom");
    await nextTick();
    await nextTick();

    const pendingChanges = (wrapper.vm as any).pendingChanges as CommitChange[];

    expect(pendingChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "create",
          type: "template_markdown",
          fileName: "1.0.0;x.md",
          content: "same content",
          encoding: "text",
        }),
      ])
    );
  });
});