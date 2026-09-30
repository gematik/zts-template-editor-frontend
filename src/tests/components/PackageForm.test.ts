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
import PackageForm from "../../components/PackageForm.vue";

type PackageModel = {
  packagename: string;
  version: string;
  title: string;
  description: string;
  author: string;
  dependencies: string;
  altTitle: string;
  keywords: string[];
  copyright: string;
};

let validateReturn: Record<string, string | null> = {};

vi.mock("naive-ui", () => ({
  NButton: {
    name: "NButton",
    template: '<button><slot /></button>',
  },
  NMessageProvider: {
    name: "NMessageProvider",
    template: "<div><slot /></div>",
  },
}));

vi.mock("../../validation/rules", () => ({
  validatePackageTemplate: (form: PackageModel) => {
    void form;
    return validateReturn;
  },
}));

describe("PackageForm.vue", () => {
  beforeEach(() => {
    validateReturn = {};
    vi.clearAllMocks();
  });

  it("initialisiert das Formular aus modelValue und Props (packageName/version überschreiben JSON)", () => {
    const initial: Partial<PackageModel> = {
      packagename: "ignored-from-json",
      version: "0.0.1",
      title: "Titel aus JSON",
      description: "Beschreibung",
      author: "Autor",
      dependencies: "a.b.c#1.2.3",
      altTitle: "Alt-Titel",
      keywords: ["k1", "k2"],
      copyright: "© Test",
    };

    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify(initial),
        packageName: "pkg-from-prop",
        version: "1.2.3",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    const nameEl = wrapper.find("#packagename").element as HTMLInputElement;
    const versionEl = wrapper.find("#version").element as HTMLInputElement;
    const titleEl = wrapper.find("#title").element as HTMLInputElement;
    const descEl = wrapper.find("#description").element as HTMLTextAreaElement;
    const authorEl = wrapper.find("#author").element as HTMLInputElement;
    const depsEl = wrapper.find("#dependencies").element as HTMLInputElement;
    const altTitleEl = wrapper.find("#altTitle").element as HTMLInputElement;
    const keywordsEl = wrapper.find("#keywords").element as HTMLInputElement;
    const copyrightEl = wrapper.find("#copyright").element as HTMLInputElement;

    expect(nameEl.value).toBe("pkg-from-prop");
    expect(versionEl.value).toBe("1.2.3");

    expect(titleEl.value).toBe("Titel aus JSON");
    expect(descEl.value).toBe("Beschreibung");
    expect(authorEl.value).toBe("Autor");
    expect(depsEl.value).toBe("a.b.c#1.2.3");
    expect(altTitleEl.value).toBe("Alt-Titel");
    expect(keywordsEl.value).toBe("");
    expect(copyrightEl.value).toBe("© Test");
  });

  it("fällt bei kaputtem JSON auf Default-Werte zurück", () => {
    const wrapper = mount(PackageForm, {
      props: {
        modelValue: "nicht-parsebares-json",
        packageName: "pkg-from-prop",
        version: "9.9.9",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    const nameEl = wrapper.find("#packagename").element as HTMLInputElement;
    const versionEl = wrapper.find("#version").element as HTMLInputElement;
    const titleEl = wrapper.find("#title").element as HTMLInputElement;
    const descEl = wrapper.find("#description").element as HTMLTextAreaElement;
    const authorEl = wrapper.find("#author").element as HTMLInputElement;

    expect(nameEl.value).toBe("pkg-from-prop");
    expect(versionEl.value).toBe("9.9.9");
    expect(titleEl.value).toBe("");
    expect(descEl.value).toBe("");
    expect(authorEl.value).toBe("");
  });

  it("emittiert valid=true und update:modelValue, wenn Validierung keine Fehler hat", async () => {
    validateReturn = {};

    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({}),
        packageName: "pkg",
        version: "1.0.0",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    // Trigger: irgendwas ändern, damit validateAndEmit wirklich emittet
    const titleInput = wrapper.find("#title");
    await titleInput.setValue("X");
    await nextTick();

    const validEmits = wrapper.emitted("valid");
    expect(validEmits).toBeTruthy();
    if (!validEmits || validEmits.length === 0) throw new Error("valid-Event wurde nicht emittiert");

    const lastValid = validEmits[validEmits.length - 1] as unknown[];
    expect(lastValid[0]).toBe(true);

    const updateEmits = wrapper.emitted("update:modelValue");
    expect(updateEmits).toBeTruthy();
    if (!updateEmits || updateEmits.length === 0) throw new Error("update:modelValue wurde nicht emittiert");

    const lastUpdate = updateEmits[updateEmits.length - 1] as unknown[];
    const payload = lastUpdate[0] as string;

    const parsed = JSON.parse(payload) as Partial<PackageModel>;
    expect(parsed.packagename).toBeUndefined();
    expect(parsed.version).toBeUndefined();
    expect(parsed.title).toBe("X");
  });


  it("lässt leere optionale Felder im emittierten JSON komplett weg", async () => {
    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({
          title: "Titel",
          description: "Beschreibung",
          author: "Autor",
          dependencies: "vorher",
          altTitle: "Alt",
          keywords: ["OPS"],
          copyright: "Max",
        }),
        packageName: "pkg",
        version: "1.0.0",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    await wrapper.find("#dependencies").setValue("");
    await wrapper.find("#copyright").setValue("");
    await nextTick();

    const updateEmits = wrapper.emitted("update:modelValue") || [];
    const payload = updateEmits[updateEmits.length - 1]?.[0] as string;
    const parsed = JSON.parse(payload) as Record<string, unknown>;

    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.copyright).toBeUndefined();
    expect(parsed.title).toBe("Titel");
  });

  it("emittiert valid=false und zeigt Fehlertexte, wenn Validierung Fehler liefert", async () => {
    validateReturn = {
      packagename: "Packagename ist erforderlich",
      title: "Title ist erforderlich",
      description: null,
    };

    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({}),
        packageName: "",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    // Trigger Input -> validateAndEmit
    const nameInput = wrapper.find("#packagename");
    await nameInput.setValue("tmp");
    await nextTick();
    await nameInput.setValue("");
    await nextTick();

    const validEmits = wrapper.emitted("valid");
    expect(validEmits).toBeTruthy();
    if (!validEmits || validEmits.length === 0) throw new Error("valid-Event wurde nicht emittiert");

    const lastValid = validEmits[validEmits.length - 1] as unknown[];
    expect(lastValid[0]).toBe(false);

    expect(wrapper.text()).toContain("Packagename ist erforderlich");
    expect(wrapper.text()).toContain("Title ist erforderlich");
  });

  it("fügt Keywords hinzu, verhindert Duplikate und kann gelöscht/geleert werden", async () => {
    validateReturn = {};

    const initial: Partial<PackageModel> = {
      packagename: "pkg",
      version: "1.0.0",
      keywords: ["bestehend"],
    };

    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify(initial),
        packageName: "pkg",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    const keywordInput = wrapper.find("#keywords");
    expect(keywordInput.exists()).toBe(true);

    // add "neu" via enter
    await keywordInput.setValue("neu");
    await keywordInput.trigger("keyup.enter");
    await nextTick();

    // duplicate "bestehend" via enter
    await keywordInput.setValue("bestehend");
    await keywordInput.trigger("keyup.enter");
    await nextTick();

    const updateEmits = wrapper.emitted("update:modelValue");
    expect(updateEmits).toBeTruthy();
    if (!updateEmits || updateEmits.length === 0) throw new Error("update:modelValue wurde nicht emittiert");

    const payload = (updateEmits[updateEmits.length - 1] as unknown[])[0] as string;
    const parsedAfterAdds = JSON.parse(payload) as PackageModel;

    expect(parsedAfterAdds.keywords.length).toBe(2);
    expect(parsedAfterAdds.keywords).toContain("bestehend");
    expect(parsedAfterAdds.keywords).toContain("neu");

    const tags = wrapper.findAll("span").filter((s) => s.text().includes("neu") && s.attributes("title") === "Entfernen");
    if (tags.length === 0 || tags[0] === undefined) throw new Error('Keyword-Tag "neu" wurde nicht gefunden');

    await tags[0].trigger("click");
    await nextTick();

    const updateEmits2 = wrapper.emitted("update:modelValue");
    expect(updateEmits2).toBeTruthy();
    if (!updateEmits2 || updateEmits2.length === 0) {
      throw new Error("update:modelValue wurde nach removeKeyword nicht emittiert");
    }

    const payload2 = (updateEmits2[updateEmits2.length - 1] as unknown[])[0] as string;
    const parsedAfterRemove = JSON.parse(payload2) as PackageModel;

    expect(parsedAfterRemove.keywords).toContain("bestehend");
    expect(parsedAfterRemove.keywords).not.toContain("neu");

    // clear keywords (Button "-")
    const buttons = wrapper.findAll("button");
    const clearBtn = buttons.find((b) => b.text() === "-");
    if (!clearBtn) throw new Error('Clear-Button "-" nicht gefunden');

    await clearBtn.trigger("click");
    await nextTick();

    const updateEmits3 = wrapper.emitted("update:modelValue");
    expect(updateEmits3).toBeTruthy();
    if (!updateEmits3 || updateEmits3.length === 0) {
      throw new Error("update:modelValue wurde nach clearKeywords nicht emittiert");
    }

    const payload3 = (updateEmits3[updateEmits3.length - 1] as unknown[])[0] as string;
    const parsedAfterClear = JSON.parse(payload3) as PackageModel;

    expect(parsedAfterClear.keywords).toBeUndefined();
    expect((keywordInput.element as HTMLInputElement).value).toBe("");
  });

  it("reagiert auf externes Update von modelValue (Felder außer packagename/version)", async () => {
    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({
          packagename: "pkg-initial",
          version: "1.0.0",
          title: "Alt",
          description: "Alt desc",
          author: "Alt author",
          dependencies: "",
          altTitle: "",
          keywords: [],
          copyright: "",
        } satisfies PackageModel),
        packageName: "pkg-initial",
        version: "1.0.0",
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    await wrapper.setProps({
      modelValue: JSON.stringify({
        packagename: "pkg-updated",
        version: "2.0.0",
        title: "Neuer Titel",
        description: "Neue Beschreibung",
        author: "Neuer Autor",
        dependencies: "x.y.z#1.2.3",
        altTitle: "Neuer Alt-Titel",
        keywords: ["k1"],
        copyright: "© Neu",
      } satisfies PackageModel),
    });
    await nextTick();

    // packagename/version bleiben aus props (werden überschrieben)
    const nameEl = wrapper.find("#packagename").element as HTMLInputElement;
    const versionEl = wrapper.find("#version").element as HTMLInputElement;

    const titleEl = wrapper.find("#title").element as HTMLInputElement;
    const descEl = wrapper.find("#description").element as HTMLTextAreaElement;
    const authorEl = wrapper.find("#author").element as HTMLInputElement;

    expect(nameEl.value).toBe("pkg-initial");
    expect(versionEl.value).toBe("1.0.0");

    expect(titleEl.value).toBe("Neuer Titel");
    expect(descEl.value).toBe("Neue Beschreibung");
    expect(authorEl.value).toBe("Neuer Autor");
  });

  it("setzt disabled/locked und readOnlyFields korrekt", () => {
    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({
          packagename: "pkg",
          version: "1.0.0",
          title: "Titel",
          description: "Desc",
          author: "Autor",
          dependencies: "",
          altTitle: "Alt",
          keywords: [],
          copyright: "",
        } satisfies PackageModel),
        packageName: "pkg",
        disabled: true,
        readOnlyFields: ["packagename", "version"],
      },
      global: {
        stubs: {
          FieldComments: true,
        },
      },
    });

    const nameEl = wrapper.find("#packagename").element as HTMLInputElement;
    const versionEl = wrapper.find("#version").element as HTMLInputElement;
    const titleEl = wrapper.find("#title").element as HTMLInputElement;
    const keywordsEl = wrapper.find("#keywords").element as HTMLInputElement;

    expect(nameEl.disabled).toBe(true);
    expect(versionEl.disabled).toBe(true);
    expect(titleEl.disabled).toBe(true);
    expect(keywordsEl.disabled).toBe(true);
  });

  it("Guard: externes modelValue-Update emittiert NICHT automatisch update:modelValue (kein Ping-Pong)", async () => {
    validateReturn = {};

    const wrapper = mount(PackageForm, {
      props: {
        modelValue: JSON.stringify({
          packagename: "pkg",
          version: "1.0.0",
          title: "Alt",
          description: "",
          author: "",
          dependencies: "",
          altTitle: "",
          keywords: [],
          copyright: "",
        } satisfies PackageModel),
        packageName: "pkg",
        version: "1.0.0",
      },
      global: { stubs: { FieldComments: true } },
    });

    // clears: falls initial emits irgendwo passieren (sollte eigentlich nix)
    (wrapper.emitted("update:modelValue") || []).length;

    await wrapper.setProps({
      modelValue: JSON.stringify({
        packagename: "pkg",
        version: "1.0.0",
        title: "Extern geändert",
        description: "x",
        author: "y",
        dependencies: "",
        altTitle: "",
        keywords: [],
        copyright: "",
      } satisfies PackageModel),
    });
    await nextTick();

    const emits = wrapper.emitted("update:modelValue") || [];
    expect(emits.length).toBe(0);
  });
});
