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
import { nextTick } from "vue";
import MetadataJson from "../../components/MetadataJson.vue";

type Metadata = {
  "package-name": string;
  "package-version": string;
  status: string;
  "publish-to-hl7": boolean;
  "additional-keywords": string | string[];
  protected: boolean;
};

function lastEmittedModelValue(wrapper: any): string {
  const emitted = (wrapper.emitted("update:modelValue") ?? []) as unknown[][];
  if (emitted.length === 0) throw new Error("update:modelValue wurde nicht emittiert");
  const last = emitted[emitted.length - 1];
  if (!last || typeof last[0] !== "string") throw new Error("update:modelValue payload ist kein string");
  return last[0];
}

describe("MetadataJson.vue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initialisiert aus modelValue und rendert Felder korrekt", () => {
    const initial: Metadata = {
      "package-name": "test-pkg",
      "package-version": "1.0.0",
      status: "deprecated",
      "publish-to-hl7": true,
      "additional-keywords": "foo,bar",
      protected: true,
    };

    const wrapper = mount(MetadataJson, {
      props: {
        modelValue: JSON.stringify(initial),
        canEdit: true,
      },
    });

    const nameInput = wrapper.find("#packageName_metadata");
    const versionInput = wrapper.find("#packageVersion_metadata");
    const statusSelect = wrapper.find("#status_metadata");
    const publishCheckbox = wrapper.find("#publishToHl7_metadata");
    const protectedCheckbox = wrapper.find("#protected_metadata");
    const keywordsInput = wrapper.find("#additionalKeywords_metadata");

    expect(nameInput.exists()).toBe(true);
    expect(versionInput.exists()).toBe(true);
    expect(statusSelect.exists()).toBe(true);
    expect(publishCheckbox.exists()).toBe(true);
    expect(protectedCheckbox.exists()).toBe(true);
    expect(keywordsInput.exists()).toBe(true);

    const nameEl = nameInput.element as HTMLInputElement;
    const versionEl = versionInput.element as HTMLInputElement;
    const statusEl = statusSelect.element as HTMLSelectElement;
    const publishEl = publishCheckbox.element as HTMLInputElement;
    const protectedEl = protectedCheckbox.element as HTMLInputElement;
    const keywordsEl = keywordsInput.element as HTMLInputElement;

    expect(nameEl.value).toBe("test-pkg");
    expect(versionEl.value).toBe("1.0.0");
    expect(statusEl.value).toBe("deprecated");
    expect(publishEl.checked).toBe(true);
    expect(protectedEl.checked).toBe(true);

    expect(keywordsEl.value).toBe("");
    expect(wrapper.text()).toContain("foo");
    expect(wrapper.text()).toContain("bar");

    const text = wrapper.text();
    expect(text).toContain('"package-name": "test-pkg"');
    expect(text).toContain('"package-version": "1.0.0"');
    expect(text).toContain('"status": "deprecated"');
  });

  it("emittiert update:modelValue wenn Felder geändert werden", async () => {
    const initial: Metadata = {
      "package-name": "pkg",
      "package-version": "0.1.0",
      status: "active",
      "publish-to-hl7": false,
      "additional-keywords": "",
      protected: false,
    };

    const wrapper = mount(MetadataJson, {
      props: {
        modelValue: JSON.stringify(initial),
        canEdit: true,
      },
    });

    const statusSelect = wrapper.find("#status_metadata");
    const publishCheckbox = wrapper.find("#publishToHl7_metadata");
    const protectedCheckbox = wrapper.find("#protected_metadata");
    const keywordsInput = wrapper.find("#additionalKeywords_metadata");

    expect(statusSelect.exists()).toBe(true);
    expect(publishCheckbox.exists()).toBe(true);
    expect(protectedCheckbox.exists()).toBe(true);
    expect(keywordsInput.exists()).toBe(true);

    await statusSelect.setValue("in-development");
    await publishCheckbox.setValue(true);
    await protectedCheckbox.setValue(true);

    await keywordsInput.setValue("alpha");
    await keywordsInput.trigger("keyup.enter");
    await nextTick();

    await keywordsInput.setValue("beta");
    await keywordsInput.trigger("keyup.enter");
    await nextTick();

    const emitted = wrapper.emitted("update:modelValue") as Array<[string]>;
    if (!emitted || emitted.length === 0) {
      throw new Error("update:modelValue wurde nicht emittiert");
    }

    const payload = emitted[emitted.length - 1]![0];

    const parsed = JSON.parse(payload) as Metadata;

    expect(parsed.status).toBe("in-development");
    expect(parsed["publish-to-hl7"]).toBe(true);
    expect(parsed.protected).toBe(true);
    expect(parsed["additional-keywords"]).toBe("alpha,beta");
  });

  it("reagiert auf externes Update von modelValue", async () => {
    const initial: Metadata = {
      "package-name": "pkg",
      "package-version": "0.1.0",
      status: "active",
      "publish-to-hl7": false,
      "additional-keywords": "",
      protected: false,
    };

    const wrapper = mount(MetadataJson, {
      props: {
        modelValue: JSON.stringify(initial),
        canEdit: true,
      },
    });

    const updated: Metadata = {
      "package-name": "other-pkg",
      "package-version": "2.0.0",
      status: "in-development",
      "publish-to-hl7": true,
      "additional-keywords": "kw1,kw2",
      protected: true,
    };

    await wrapper.setProps({ modelValue: JSON.stringify(updated) });
    await nextTick();

    const nameEl = wrapper.find("#packageName_metadata").element as HTMLInputElement;
    const versionEl = wrapper.find("#packageVersion_metadata").element as HTMLInputElement;
    const statusEl = wrapper.find("#status_metadata").element as HTMLSelectElement;
    const publishEl = wrapper.find("#publishToHl7_metadata").element as HTMLInputElement;
    const protectedEl = wrapper.find("#protected_metadata").element as HTMLInputElement;
    const keywordsEl = wrapper.find("#additionalKeywords_metadata").element as HTMLInputElement;

    expect(nameEl.value).toBe("other-pkg");
    expect(versionEl.value).toBe("2.0.0");
    expect(statusEl.value).toBe("in-development");
    expect(publishEl.checked).toBe(true);
    expect(protectedEl.checked).toBe(true);

    expect(keywordsEl.value).toBe("");
    expect(wrapper.text()).toContain("kw1");
    expect(wrapper.text()).toContain("kw2");
  });

  it("deaktiviert editierbare Felder wenn canEdit=false", () => {
    const initial: Metadata = {
      "package-name": "pkg",
      "package-version": "0.1.0",
      status: "active",
      "publish-to-hl7": true,
      "additional-keywords": "x,y",
      protected: true,
    };

    const wrapper = mount(MetadataJson, {
      props: {
        modelValue: JSON.stringify(initial),
        canEdit: false,
      },
    });

    const statusEl = wrapper.find("#status_metadata").element as HTMLSelectElement;
    const publishEl = wrapper.find("#publishToHl7_metadata").element as HTMLInputElement;
    const protectedEl = wrapper.find("#protected_metadata").element as HTMLInputElement;
    const keywordsEl = wrapper.find("#additionalKeywords_metadata").element as HTMLInputElement;

    expect(statusEl.disabled).toBe(true);
    expect(publishEl.disabled).toBe(true);
    expect(protectedEl.disabled).toBe(true);
    expect(keywordsEl.disabled).toBe(true);

    const nameEl = wrapper.find("#packageName_metadata").element as HTMLInputElement;
    const versionEl = wrapper.find("#packageVersion_metadata").element as HTMLInputElement;
    expect(nameEl.disabled).toBe(true);
    expect(versionEl.disabled).toBe(true);
  });

  describe("MetadataJson.vue (extra coverage)", () => {
    it("zeigt Validierungsfehler wenn keine Additional Keywords vorhanden sind (min 1)", async () => {
      const initial: Metadata = {
        "package-name": "pkg",
        "package-version": "1.0.0",
        status: "active",
        "publish-to-hl7": false,
        "additional-keywords": "",
        protected: false,
      };

      const wrapper = mount(MetadataJson, {
        props: { modelValue: JSON.stringify(initial), canEdit: true },
      });

      await nextTick();
      expect(wrapper.text()).toContain("Mindestens 1 Keyword ist erforderlich.");
    });

    it("fügt mehrere Keywords über Komma getrennt hinzu und dedupliziert", async () => {
      const initial: Metadata = {
        "package-name": "pkg",
        "package-version": "1.0.0",
        status: "active",
        "publish-to-hl7": false,
        "additional-keywords": "",
        protected: false,
      };

      const wrapper = mount(MetadataJson, {
        props: { modelValue: JSON.stringify(initial), canEdit: true },
      });

      const input = wrapper.find("#additionalKeywords_metadata");
      await input.setValue("a, a, b");
      await input.trigger("keyup.enter");
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain("a");
      expect(text).toContain("b");
      expect(text).toContain('"additional-keywords": "a,b"');
    });

    it("parse modelValue mit additional-keywords als Array akzeptiert und rendert Chips", async () => {
      const initial: Metadata = {
        "package-name": "pkg",
        "package-version": "1.0.0",
        status: "active",
        "publish-to-hl7": false,
        "additional-keywords": ["aa", "bb"],
        protected: false,
      };

      const wrapper = mount(MetadataJson, {
        props: { modelValue: JSON.stringify(initial), canEdit: true },
      });

      await nextTick();
      const text = wrapper.text();
      expect(text).toContain("aa");
      expect(text).toContain("bb");
      expect(text).toContain('"additional-keywords": "aa,bb"');
    });

    it("bei kaputtem JSON in modelValue wird console.error geloggt und Component crasht nicht", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined as any);

      const wrapper = mount(MetadataJson, {
        props: { modelValue: "{not-json", canEdit: true },
      });

      await nextTick();
      expect(spy).toHaveBeenCalled();
      expect(wrapper.find("#packageName_metadata").exists()).toBe(true);

      spy.mockRestore();
    });

    it("externes Update von modelValue soll nicht sofort update:modelValue zurück-emittieren (syncingFromOutside)", async () => {
      const initial: Metadata = {
        "package-name": "pkg",
        "package-version": "1.0.0",
        status: "active",
        "publish-to-hl7": false,
        "additional-keywords": "",
        protected: false,
      };

      const wrapper = mount(MetadataJson, {
        props: { modelValue: JSON.stringify(initial), canEdit: true },
      });

      wrapper.emitted("update:modelValue");

      const updated: Metadata = {
        "package-name": "pkg2",
        "package-version": "2.0.0",
        status: "deprecated",
        "publish-to-hl7": true,
        "additional-keywords": "a",
        protected: true,
      };

      await wrapper.setProps({ modelValue: JSON.stringify(updated) });
      await nextTick();

      const emits = wrapper.emitted("update:modelValue") ?? [];
      expect(emits.length).toBe(0);

      expect((wrapper.find("#packageName_metadata").element as HTMLInputElement).value).toBe("pkg2");
      expect(wrapper.text()).toContain("a");
    });

    it("removeAdditionalKeyword: Klick auf Chip entfernt Keyword und emittiert JSON", async () => {
      const initial: Metadata = {
        "package-name": "pkg",
        "package-version": "1.0.0",
        status: "active",
        "publish-to-hl7": false,
        "additional-keywords": "x,y",
        protected: false,
      };

      const wrapper = mount(MetadataJson, {
        props: { modelValue: JSON.stringify(initial), canEdit: true },
      });

      await nextTick();

      const clickable = wrapper
        .findAll("span")
        .find((s: any) => (s.text() || "").trim().startsWith("x") && (s.attributes("title") || "") === "Entfernen");

      expect(clickable).toBeTruthy();
      await clickable!.trigger("click");
      await nextTick();

      expect(wrapper.text()).toContain('"additional-keywords": "y"');
      expect(wrapper.text()).not.toContain('"additional-keywords": "x,y"');

      const payload = lastEmittedModelValue(wrapper);
      const parsed = JSON.parse(payload) as any;
      expect(parsed["additional-keywords"]).toBe("y");
    });
  });
});
