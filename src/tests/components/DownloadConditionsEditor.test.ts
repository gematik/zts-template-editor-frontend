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

import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { defineComponent, h, nextTick } from "vue"

type EditorUpdateCb = (p: { editor: any }) => void

const createdEditors: any[] = []

vi.mock("@tiptap/vue-3", () => {
    class FakeChain {
        private e: any
        constructor(e: any) {
            this.e = e
        }
        focus() {
            this.e._calls.focus++
            return this
        }
        toggleBold() {
            this.e._calls.toggleBold++
            return this
        }
        toggleItalic() {
            this.e._calls.toggleItalic++
            return this
        }
        setParagraph() {
            this.e._calls.setParagraph++
            return this
        }
        toggleHeading(_opts: any) {
            this.e._calls.toggleHeading++
            return this
        }
        toggleBulletList() {
            this.e._calls.toggleBulletList++
            return this
        }
        toggleCodeBlock() {
            this.e._calls.toggleCodeBlock++
            return this
        }
        setHardBreak() {
            this.e._calls.setHardBreak++
            return this
        }
        undo() {
            this.e._calls.undo++
            return this
        }
        redo() {
            this.e._calls.redo++
            return this
        }
        toggleList(_list: any, _item: any) {
            this.e._calls.toggleList++
            this.e._active.orderedList = true
            return this
        }
        updateAttributes(_node: any, attrs: any) {
            this.e._calls.updateAttributes++
            if (attrs?.variant) this.e._orderedListVariant = attrs.variant
            return this
        }
        extendMarkRange(_m: any) {
            this.e._calls.extendMarkRange++
            return this
        }
        setLink(attrs: any) {
            this.e._calls.setLink++
            this.e._linkAttrs = { ...attrs }
            this.e._active.link = true
            return this
        }
        unsetLink() {
            this.e._calls.unsetLink++
            this.e._linkAttrs = { href: "", title: "" }
            this.e._active.link = false
            return this
        }
        run() {
            this.e._calls.run++
            return true
        }
    }

    class Editor {
        _html: string
        _onUpdate?: EditorUpdateCb
        _destroyed = false

        _calls = {
            focus: 0,
            toggleBold: 0,
            toggleItalic: 0,
            setParagraph: 0,
            toggleHeading: 0,
            toggleBulletList: 0,
            toggleCodeBlock: 0,
            setHardBreak: 0,
            undo: 0,
            redo: 0,
            toggleList: 0,
            updateAttributes: 0,
            extendMarkRange: 0,
            setLink: 0,
            unsetLink: 0,
            run: 0,
            setContent: 0,
            setEditable: 0,
            blur: 0,
            destroy: 0,
        }

        _isEditable = true

        _active: Record<string, any> = {
            bold: false,
            italic: false,
            paragraph: true,
            orderedList: false,
            bulletList: false,
            codeBlock: false,
            link: false,
        }

        _orderedListVariant: "decimal" | "loweralpha" | null = null
        _linkAttrs: { href?: string; title?: string | null } = { href: "", title: "" }

        commands = {
            setContent: (html: string) => {
                this._calls.setContent++
                this._html = html
            },
            blur: () => {
                this._calls.blur++
            },
        }

        setEditable(editable: boolean) {
            this._calls.setEditable++
            this._isEditable = editable
        }

        constructor(opts: any) {
            this._html = opts?.content ?? ""
            this._onUpdate = opts?.onUpdate
            createdEditors.push(this)
        }

        chain() {
            return new FakeChain(this)
        }

        can() {
            return {
                undo: () => true,
                redo: () => true,
            }
        }

        isActive(type: string, attrs?: any) {
            if (type === "orderedList") {
                const wanted = attrs?.listStyleType
                if (!this._active.orderedList) return false
                if (!wanted) return true
                return this._orderedListVariant === wanted
            }
            if (type === "heading") return false
            return !!this._active[type]
        }

        getHTML() {
            return this._html
        }

        getAttributes(type: string) {
            if (type === "link") return { ...this._linkAttrs }
            return {}
        }

        destroy() {
            this._calls.destroy++
            this._destroyed = true
        }

        _triggerUpdate(newHtml?: string) {
            if (typeof newHtml === "string") this._html = newHtml
            this._onUpdate?.({ editor: this })
        }
    }

    const EditorContent = defineComponent({
        name: "EditorContent",
        props: { editor: Object },
        setup() {
            return () => h("div", { "data-testid": "editor-content" })
        },
    })

    return { Editor, EditorContent }
})

vi.mock("@tiptap/starter-kit", () => ({ default: { configure: () => ({}) } }))
vi.mock("@tiptap/extension-link", () => ({ default: { configure: () => ({}) } }))
vi.mock("@tiptap/extension-ordered-list", () => ({ default: { extend: () => ({}) } }))
vi.mock("@tiptap/extension-placeholder", () => ({ default: { configure: () => ({}) } }))

vi.mock("@vicons/fluent", () => {
    const IconStub = defineComponent({ name: "IconStub", setup: () => () => h("i") })
    return {
        TextBold24Regular: IconStub,
        TextItalic20Regular: IconStub,
        TextField20Regular: IconStub,
        TextFontSize24Regular: IconStub,
        TextFontSize20Regular: IconStub,
        TextFontSize16Regular: IconStub,
        Code20Regular: IconStub,
        DocumentPageBreak20Regular: IconStub,
        TextBulletListLtr20Regular: IconStub,
        TextNumberListLtr20Regular: IconStub,
        Link24Regular: IconStub,
        LinkDismiss20Regular: IconStub,
        ArrowUndo20Regular: IconStub,
        ArrowRedo20Regular: IconStub,
    }
})

const NButtonStub = defineComponent({
    name: "NButton",
    props: { disabled: Boolean, loading: Boolean, type: String },
    emits: ["click"],
    setup(props, { emit, slots, attrs }) {
        return () =>
            h(
                "button",
                {
                    ...attrs,
                    disabled: props.disabled,
                    "data-type": props.type ?? "",
                    "data-loading": props.loading ? "1" : "0",
                    onClick: () => emit("click"),
                },
                slots.default?.()
            )
    },
})

const NTooltipStub = defineComponent({
    name: "NTooltip",
    setup(_, { slots }) {
        return () => h("div", { "data-testid": "tooltip" }, slots.trigger?.())
    },
})

const NIconStub = defineComponent({
    name: "NIcon",
    setup(_, { slots }) {
        return () => h("span", { "data-testid": "icon" }, slots.default?.())
    },
})

const NModalStub = defineComponent({
    name: "NModal",
    props: { show: Boolean },
    emits: ["update:show"],
    setup(props, { slots }) {
        return () => (props.show ? h("div", { "data-testid": "modal" }, slots.default?.()) : null)
    },
})

const NCardStub = defineComponent({
    name: "NCard",
    emits: ["close"],
    setup(_, { slots, emit }) {
        return () =>
            h("div", { "data-testid": "card" }, [
                h(
                    "button",
                    {
                        "data-testid": "card-close",
                        onClick: () => emit("close"),
                    },
                    "x"
                ),
                slots.default?.(),
                slots.footer?.(),
            ])
    },
})

const NInputStub = defineComponent({
    name: "NInput",
    props: { value: String, placeholder: String, id: String },
    emits: ["update:value"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                ...attrs,
                id: props.id,
                value: props.value ?? "",
                onInput: (e: any) => emit("update:value", e.target.value),
            })
    },
})

vi.mock("naive-ui", async () => {
    const { defineComponent, h } = await import("vue")

    const NButton = defineComponent({
        name: "NButton",
        props: { disabled: Boolean, loading: Boolean, type: String },
        emits: ["click"],
        setup(props, { emit, slots, attrs }) {
            return () =>
                h(
                    "button",
                    {
                        ...attrs,
                        disabled: props.disabled,
                        "data-type": props.type ?? "",
                        "data-loading": props.loading ? "1" : "0",
                        onClick: () => emit("click"),
                    },
                    slots.default?.()
                )
        },
    })

    const NTooltip = defineComponent({
        name: "NTooltip",
        setup(_, { slots }) {
            return () => h("div", { "data-testid": "tooltip" }, slots.trigger?.())
        },
    })

    const NIcon = defineComponent({
        name: "NIcon",
        setup(_, { slots }) {
            return () => h("span", { "data-testid": "icon" }, slots.default?.())
        },
    })

    const NModal = defineComponent({
        name: "NModal",
        props: { show: Boolean },
        emits: ["update:show"],
        setup(props, { slots }) {
            return () => (props.show ? h("div", { "data-testid": "modal" }, slots.default?.()) : null)
        },
    })

    const NCard = defineComponent({
        name: "NCard",
        emits: ["close"],
        setup(_, { slots, emit }) {
            return () =>
                h("div", { "data-testid": "card" }, [
                    h(
                        "button",
                        { "data-testid": "card-close", onClick: () => emit("close") },
                        "x"
                    ),
                    slots.default?.(),
                    slots.footer?.(),
                ])
        },
    })

    const NInput = defineComponent({
        name: "NInput",
        props: { value: String, placeholder: String, id: String },
        emits: ["update:value"],
        setup(props, { emit, attrs }) {
            return () =>
                h("input", {
                    ...attrs,
                    id: props.id,
                    value: props.value ?? "",
                    onInput: (e: any) => emit("update:value", e.target.value),
                })
        },
    })

    return { NButton, NTooltip, NIcon, NModal, NCard, NInput }
})

import ConditionsEditor from "../../components/DownloadConditionsEditor.vue"

function mountIt(extraProps: any = {}) {
    return mount(ConditionsEditor as any, {
        props: {
            canEdit: true,
            disabled: false,
            conditionsValue: "<p>init</p>",
            ...extraProps,
        },
        global: {
            components: {
                // Falls irgendwo Tags auftauchen, die nicht als import genutzt werden:
                NButton: NButtonStub,
                NTooltip: NTooltipStub,
                NIcon: NIconStub,
                NModal: NModalStub,
                NCard: NCardStub,
                NInput: NInputStub,
            },
            stubs: {
                // Sicherheit: falls doch noch irgendwas reinkommt
                EditorContent: true,
            },
        },
    })
}

function lastEditor() {
    expect(createdEditors.length).toBeGreaterThan(0)
    return createdEditors[createdEditors.length - 1]
}

describe("DownloadConditionsEditor", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        createdEditors.length = 0
    })

    it("mounts and creates editor with initial content", async () => {
        const wrapper = mountIt({ conditionsValue: "<p>Hello</p>" })
        await nextTick()

        const ed = lastEditor()
        expect(ed.getHTML()).toBe("<p>Hello</p>")
        expect(wrapper.find('.editor-content').exists()).toBe(true)
    })

    it("emits update:conditionsValue when editor updates", async () => {
        const wrapper = mountIt({ conditionsValue: "<p>init</p>" })
        await nextTick()

        const ed = lastEditor()
        ed._triggerUpdate("<p>changed</p>")
        await nextTick()

        const emits = wrapper.emitted("update:conditionsValue") ?? []
        expect(emits.length).toBeGreaterThan(0)
        expect(emits[emits.length - 1]?.[0]).toBe("<p>changed</p>")
    })

    it("updates editor content when props.conditionsValue changes", async () => {
        const wrapper = mountIt({ conditionsValue: "<p>a</p>" })
        await nextTick()

        const ed = lastEditor()
        expect(ed._calls.setContent).toBe(0)

        await wrapper.setProps({ conditionsValue: "<p>b</p>" })
        await nextTick()

        expect(ed._calls.setContent).toBe(1)
        expect(ed.getHTML()).toBe("<p>b</p>")
    })

    it("focuses editor when clicking container outside toolbar", async () => {
        const wrapper = mountIt()
        await nextTick()

        const ed = lastEditor()

        await wrapper.find(".container").trigger("click")
        expect(ed._calls.focus).toBeGreaterThan(0)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("opens link modal, applies link, and closes modal", async () => {
        const wrapper = mountIt()
        await nextTick()

        const ed = lastEditor()
        ed._linkAttrs = { href: "https://old", title: "oldtitle" }
        ed._active.link = true

        const buttons = wrapper.findAll("button")
        expect(buttons.length).toBeGreaterThan(10)

        let opened = false
        for (const b of buttons) {
            await b.trigger("click")
            await nextTick()
            if (wrapper.find('[data-testid="modal"]').exists()) {
                opened = true
                break
            }
        }
        expect(opened).toBe(true)

        const inputs = wrapper.findAll("input")
        expect(inputs.length).toBeGreaterThanOrEqual(2)

        expect((inputs[0]?.element as HTMLInputElement).value).toBe("https://old")
        expect((inputs[1]?.element as HTMLInputElement).value).toBe("oldtitle")

        await inputs[0]?.setValue("https://example.com")
        await inputs[1]?.setValue("tooltip")
        await nextTick()

        const modalButtons = wrapper.find('[data-testid="modal"]').findAll("button")
        expect(modalButtons.length).toBeGreaterThanOrEqual(3)

        await modalButtons[modalButtons.length - 1]?.trigger("click")
        await nextTick()

        expect(ed._calls.setLink).toBe(1)
        expect(ed._linkAttrs.href).toBe("https://example.com")
        expect(ed._linkAttrs.title).toBe("tooltip")

        expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
    })

    it("removes link (unsetLink) and closes modal", async () => {
        const wrapper = mountIt()
        await nextTick()

        const ed = lastEditor()
        ed._active.link = true

        const buttons = wrapper.findAll("button")
        let opened = false
        for (const b of buttons) {
            await b.trigger("click")
            await nextTick()
            if (wrapper.find('[data-testid="modal"]').exists()) {
                opened = true
                break
            }
        }
        expect(opened).toBe(true)

        const modalButtons = wrapper.find('[data-testid="modal"]').findAll("button")
        expect(modalButtons.length).toBeGreaterThan(0)

        await modalButtons[1]?.trigger("click")
        await nextTick()

        expect(ed._calls.unsetLink).toBe(1)
        expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
    })

    it("does NOT focus editor when clicking inside toolbar (click.stop)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btn = wrapper.find(".toolbar").find("button")
        expect(btn.exists()).toBe(true)

        await btn.trigger("click")
        await nextTick()
        const beforeFocus = ed._calls.focus
        const beforeRun = ed._calls.run

        await wrapper.find(".toolbar-wrapper").trigger("click")
        await nextTick()

        expect(ed._calls.focus).toBe(beforeFocus)
        expect(ed._calls.run).toBe(beforeRun)
    })

    it("bold button triggers toggleBold + focus + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const boldBtn = wrapper.find(".toolbar").findAll("button")[0]
        expect(boldBtn).toBeTruthy()

        await boldBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleBold).toBe(1)
        expect(ed._calls.focus).toBeGreaterThan(0)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("italic button triggers toggleItalic + focus + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const italicBtn = wrapper.find(".toolbar").findAll("button")[1]
        await italicBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleItalic).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("paragraph button triggers setParagraph + focus + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const pBtn = wrapper.find(".toolbar").findAll("button")[2]
        await pBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.setParagraph).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("heading buttons call toggleHeading (level 3/4/5)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btns = wrapper.find(".toolbar").findAll("button")
        await btns[3]?.trigger("click")
        await btns[4]?.trigger("click")
        await btns[5]?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleHeading).toBe(3)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("bullet list button triggers toggleBulletList + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btns = wrapper.find(".toolbar").findAll("button")
        await btns[6]?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleBulletList).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("code block button triggers toggleCodeBlock + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btns = wrapper.find(".toolbar").findAll("button")
        await btns[9]?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleCodeBlock).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("hard break button triggers setHardBreak + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btns = wrapper.find(".toolbar").findAll("button")
        await btns[12]?.trigger("click")
        await nextTick()

        expect(ed._calls.setHardBreak).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("undo/redo buttons trigger undo/redo + run", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const btns = wrapper.find(".toolbar").findAll("button")

        const undoBtn = btns[13]
        const redoBtn = btns[14]

        await undoBtn?.trigger("click")
        await redoBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.undo).toBe(1)
        expect(ed._calls.redo).toBe(1)
        expect(ed._calls.run).toBeGreaterThan(0)
    })

    it("toggleDecimalList: when orderedList NOT active -> toggleList + updateAttributes(decimal)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        ed._active.orderedList = false
        ed._orderedListVariant = null

        const btns = wrapper.find(".toolbar").findAll("button")
        const decimalBtn = btns[7]

        await decimalBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleList).toBe(1)
        expect(ed._calls.updateAttributes).toBe(1)
        expect(ed._orderedListVariant).toBe("decimal")
    })

    it("toggleDecimalList: when orderedList active -> only updateAttributes(decimal)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        ed._active.orderedList = true
        ed._orderedListVariant = "loweralpha"

        const btns = wrapper.find(".toolbar").findAll("button")
        const decimalBtn = btns[7]

        await decimalBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleList).toBe(0)
        expect(ed._calls.updateAttributes).toBe(1)
        expect(ed._orderedListVariant).toBe("decimal")
    })

    it("toggleAlphaList: when orderedList NOT active -> toggleList + updateAttributes(loweralpha)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        ed._active.orderedList = false
        ed._orderedListVariant = null

        const btns = wrapper.find(".toolbar").findAll("button")
        const alphaBtn = btns[8]

        await alphaBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleList).toBe(1)
        expect(ed._calls.updateAttributes).toBe(1)
        expect(ed._orderedListVariant).toBe("loweralpha")
    })

    it("toggleAlphaList: when orderedList active -> only updateAttributes(loweralpha)", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        ed._active.orderedList = true
        ed._orderedListVariant = "decimal"

        const btns = wrapper.find(".toolbar").findAll("button")
        const alphaBtn = btns[8]

        await alphaBtn?.trigger("click")
        await nextTick()

        expect(ed._calls.toggleList).toBe(0)
        expect(ed._calls.updateAttributes).toBe(1)
        expect(ed._orderedListVariant).toBe("loweralpha")
    })

    it("applyLink: empty URL calls unsetLink (removeLink) and closes modal", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        const buttons = wrapper.findAll("button")
        let opened = false
        for (const b of buttons) {
            await b.trigger("click")
            await nextTick()
            if (wrapper.find('[data-testid="modal"]').exists()) {
                opened = true
                break
            }
        }
        expect(opened).toBe(true)

        const inputs = wrapper.findAll("input")
        await inputs[0]?.setValue("")
        await inputs[1]?.setValue("whatever")
        await nextTick()

        const modalButtons = wrapper.find('[data-testid="modal"]').findAll("button")
        await modalButtons[modalButtons.length - 1]?.trigger("click")
        await nextTick()

        expect(ed._calls.setLink).toBe(0)
        expect(ed._calls.unsetLink).toBe(1)
        expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
    })

    it("closeLinkModal via card close clears inputs (reopen modal shows empty)", async () => {
        const wrapper = mountIt()
        await nextTick()

        const buttons = wrapper.findAll("button")
        let opened = false
        for (const b of buttons) {
            await b.trigger("click")
            await nextTick()
            if (wrapper.find('[data-testid="modal"]').exists()) {
                opened = true
                break
            }
        }
        expect(opened).toBe(true)

        const inputs = wrapper.findAll("input")
        await inputs[0]?.setValue("https://x")
        await inputs[1]?.setValue("t")
        await nextTick()

        await wrapper.find('[data-testid="card-close"]').trigger("click")
        await nextTick()
        expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)

        opened = false
        for (const b of wrapper.findAll("button")) {
            await b.trigger("click")
            await nextTick()
            if (wrapper.find('[data-testid="modal"]').exists()) {
                opened = true
                break
            }
        }
        expect(opened).toBe(true)

        const inputs2 = wrapper.findAll("input")
        expect((inputs2[0]?.element as HTMLInputElement).value).toBe("")
        expect((inputs2[1]?.element as HTMLInputElement).value).toBe("")
    })

    it("watcher does NOT call setContent when new props equal current editor HTML", async () => {
        const wrapper = mountIt({ conditionsValue: "<p>a</p>" })
        await nextTick()
        const ed = lastEditor()

        await wrapper.setProps({ conditionsValue: "<p>a</p>" })
        await nextTick()

        expect(ed._calls.setContent).toBe(0)
    })

    it("disabled watcher toggles editable state and blurs only when disabled", async () => {
        const wrapper = mountIt({ disabled: false })
        await nextTick()
        const ed = lastEditor()

        await wrapper.setProps({ disabled: true })
        await nextTick()

        expect(ed._calls.setEditable).toBeGreaterThanOrEqual(1)
        expect(ed._isEditable).toBe(false)
        expect(ed._calls.blur).toBe(1)

        await wrapper.setProps({ disabled: false })
        await nextTick()

        expect(ed._isEditable).toBe(true)
        expect(ed._calls.blur).toBe(1)
    })

    it("destroys editor on unmount", async () => {
        const wrapper = mountIt()
        await nextTick()
        const ed = lastEditor()

        expect(ed._calls.destroy).toBe(0)
        wrapper.unmount()
        expect(ed._calls.destroy).toBe(1)
    })
})
