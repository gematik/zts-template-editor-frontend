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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";

vi.mock("../../api/comments", () => ({
    getComments: vi.fn(),
    createComment: vi.fn(),
    replyToThread: vi.fn(),
}));

import { useComments } from "../../composables/useComments";
import * as commentsApi from "../../api/comments";

type CommentType = any;

function c(overrides: Partial<any> = {}) {
    return {
        id: overrides.id ?? "c1",
        threadId: overrides.threadId ?? null,
        fileName: overrides.fileName ?? "f.md",
        type: overrides.type ?? ("x" as CommentType),
        line: overrides.line ?? 1,
        body: overrides.body ?? "body",
        author: overrides.author ?? "a",
        resolved: overrides.resolved ?? false,
        createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useComments.ts", () => {
    it("immediate watch: wenn mrId null => refresh leert items und ruft getComments NICHT", async () => {
        (commentsApi.getComments as any).mockResolvedValue({ comments: [c()] });

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(null),
            canWrite: ref(true),
        };

        const m = useComments(ctx);

        await nextTick();

        expect(commentsApi.getComments).not.toHaveBeenCalled();
        expect(m.items.value).toEqual([]);
        expect(m.threads.value).toEqual([]);
    });

    it("refresh(): mit mrId => ruft getComments korrekt auf und setzt items", async () => {
        (commentsApi.getComments as any).mockResolvedValue({
            comments: [c({ id: "a" }), c({ id: "b" })],
        });

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(123),
            canWrite: ref(true),
        };

        const m = useComments(ctx);

        await Promise.resolve();
        await Promise.resolve();

        expect(commentsApi.getComments).toHaveBeenCalledTimes(1);
        expect(commentsApi.getComments).toHaveBeenCalledWith({
            repositoryId: "repo1",
            mrId: "123",
            branch: "b1",
            version: "1.0.0",
        });
        expect(m.items.value.map((x: any) => x.id)).toEqual(["a", "b"]);
    });

    it("threads: gruppiert nach threadId (fallback id), sortiert comments nach createdAt asc, threads nach letzter createdAt desc", async () => {
        (commentsApi.getComments as any).mockResolvedValue({
            comments: [
                c({ id: "c1", threadId: "t1", createdAt: "2025-01-02T00:00:00.000Z" }),
                c({ id: "c2", threadId: "t1", createdAt: "2025-01-01T00:00:00.000Z" }),

                c({ id: "c3", threadId: "t2", createdAt: "2025-02-01T00:00:00.000Z" }),

                c({ id: "solo", threadId: null, createdAt: "2025-01-15T00:00:00.000Z" }),
            ],
        });

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(7),
            canWrite: ref(true),
        };

        const m = useComments(ctx);
        await Promise.resolve();
        await Promise.resolve();

        const threads = m.threads.value as any[];

        expect(threads.map((t) => t.threadId)).toEqual(["t2", "solo", "t1"]);

        const t1 = threads.find((t) => t.threadId === "t1")!;
        expect(t1.comments.map((x: any) => x.id)).toEqual(["c2", "c1"]);

        const solo = threads.find((t) => t.threadId === "solo")!;
        expect(solo.comments).toHaveLength(1);
        expect(solo.comments[0].id).toBe("solo");
    });

    it("addComment(): wirft Fehler wenn canWrite=false", async () => {
        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(123),
            canWrite: ref(false),
        };
        const m = useComments(ctx);

        await expect(
            m.addComment({ type: "x", fileName: "a.md", line: 1, body: "hi" } as any)
        ).rejects.toThrow(/nur im Review erlaubt/i);

        expect(commentsApi.createComment).not.toHaveBeenCalled();
    });

    it("addComment(): wirft Fehler wenn mrId fehlt", async () => {
        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(null),
            canWrite: ref(true),
        };
        const m = useComments(ctx);

        await expect(
            m.addComment({ type: "x", fileName: "a.md", line: 1, body: "hi" } as any)
        ).rejects.toThrow(/Kein MR/i);

        expect(commentsApi.createComment).not.toHaveBeenCalled();
    });

    it("addComment(): ruft createComment und danach refresh (getComments erneut)", async () => {
        (commentsApi.getComments as any)
            .mockResolvedValueOnce({ comments: [] }) // initial refresh
            .mockResolvedValueOnce({ comments: [c({ id: "after" })] }); // refresh nach create

        (commentsApi.createComment as any).mockResolvedValue(undefined);

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(55),
            canWrite: ref(true),
        };

        const m = useComments(ctx);
        await Promise.resolve();
        await Promise.resolve();

        expect(commentsApi.getComments).toHaveBeenCalledTimes(1);

        await m.addComment({
            type: "package_markdown" as any,
            fileName: "x.md",
            line: 9,
            body: "hello",
        } as any);

        expect(commentsApi.createComment).toHaveBeenCalledTimes(1);
        expect(commentsApi.createComment).toHaveBeenCalledWith({
            repositoryId: "repo1",
            branch: "b1",
            mrId: "55",
            version: "1.0.0",
            type: "package_markdown",
            fileName: "x.md",
            line: 9,
            body: "hello",
        });

        expect(commentsApi.getComments).toHaveBeenCalledTimes(2);
        expect(m.items.value.map((x: any) => x.id)).toEqual(["after"]);
    });

    it("reply(): wirft Fehler wenn canWrite=false", async () => {
        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(123),
            canWrite: ref(false),
        };
        const m = useComments(ctx);

        await expect(
            m.reply({ threadId: "t1", body: "x", resolved: true })
        ).rejects.toThrow(/nur im Review erlaubt/i);

        expect(commentsApi.replyToThread).not.toHaveBeenCalled();
    });

    it("reply(): wirft Fehler wenn mrId null", async () => {
        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(null),
            canWrite: ref(true),
        };
        const m = useComments(ctx);

        await expect(
            m.reply({ threadId: "t1", body: "x", resolved: true })
        ).rejects.toThrow(/Kein MR/i);

        expect(commentsApi.replyToThread).not.toHaveBeenCalled();
    });

    it("reply(): ruft replyToThread und danach refresh", async () => {
        (commentsApi.getComments as any)
            .mockResolvedValueOnce({ comments: [c({ id: "before" })] }) // initial refresh
            .mockResolvedValueOnce({ comments: [c({ id: "after" })] }); // refresh nach reply
        (commentsApi.replyToThread as any).mockResolvedValue(undefined);

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(99),
            canWrite: ref(true),
        };
        const m = useComments(ctx);

        await Promise.resolve();
        await Promise.resolve();

        await m.reply({ threadId: "t9", body: "reply", resolved: false });

        expect(commentsApi.replyToThread).toHaveBeenCalledTimes(1);
        expect(commentsApi.replyToThread).toHaveBeenCalledWith({
            repositoryId: "repo1",
            mrId: 99,
            threadId: "t9",
            body: "reply",
            resolved: false,
        });

        expect(commentsApi.getComments).toHaveBeenCalledTimes(2);
        expect(m.items.value.map((x: any) => x.id)).toEqual(["after"]);
    });

    it("watch reagiert auf ctx-Änderungen und ruft refresh erneut", async () => {
        (commentsApi.getComments as any)
            .mockResolvedValueOnce({ comments: [] })
            .mockResolvedValueOnce({ comments: [c({ id: "x" })] });

        const ctx = {
            repositoryId: ref("repo1"),
            branch: ref("b1"),
            version: ref("1.0.0"),
            mrId: ref<number | null>(1),
            canWrite: ref(true),
        };

        const m = useComments(ctx);

        await Promise.resolve();
        await Promise.resolve();
        expect(commentsApi.getComments).toHaveBeenCalledTimes(1);

        ctx.branch.value = "b2";
        await nextTick();
        await Promise.resolve();
        await Promise.resolve();

        expect(commentsApi.getComments).toHaveBeenCalledTimes(2);
        expect(commentsApi.getComments).toHaveBeenLastCalledWith({
            repositoryId: "repo1",
            mrId: "1",
            branch: "b2",
            version: "1.0.0",
        });
        expect(m.items.value.map((x: any) => x.id)).toEqual(["x"]);
    });
});
