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

vi.mock("../../api/http", () => {
    return {
        api: vi.fn(),
    };
});

import { api } from "../../api/http";
import { getComments, createComment, replyToThread } from "../../api/comments";

describe("api/comments.ts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getComments baut Query korrekt und ruft api mit GET-URL", async () => {
        (api as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

        const params = {
            repositoryId: "repo-1",
            mrId: "123",
            branch: "feature/test",
            version: "2025.1.0",
        };

        await getComments(params);

        expect(api).toHaveBeenCalledTimes(1);

        const calledUrl = (api as any).mock.calls[0][0] as string;
        expect(calledUrl.startsWith("/api/workspaces/comments?")).toBe(true);

        const qs = calledUrl.split("?")[1] || "";
        const sp = new URLSearchParams(qs);
        expect(sp.get("repositoryId")).toBe("repo-1");
        expect(sp.get("mrId")).toBe("123");
        expect(sp.get("branch")).toBe("feature/test");
        expect(sp.get("version")).toBe("2025.1.0");

        expect((api as any).mock.calls[0].length).toBe(1);
    });

    it("createComment ruft api POST /workspaces/comments mit JSON body", async () => {
        (api as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "c1" });

        const body = {
            repositoryId: "repo-1",
            mrId: "123",
            fileName: "metadata_package.json",
            type: "metadata_package",
            line: 12,
            body: "Hallo",
        } as any;

        await createComment(body);

        expect(api).toHaveBeenCalledTimes(1);
        expect(api).toHaveBeenCalledWith("/api/workspaces/comments", {
            method: "POST",
            body: JSON.stringify(body),
        });
    });

    it("replyToThread ruft api POST /workspaces/comments/reply mit JSON body", async () => {
        (api as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });

        const body = {
            threadId: "t-1",
            body: "reply",
            resolved: false,
        } as any;

        await replyToThread(body);

        expect(api).toHaveBeenCalledTimes(1);
        expect(api).toHaveBeenCalledWith("/api/workspaces/comments/reply", {
            method: "POST",
            body: JSON.stringify(body),
        });
    });

    it("leitet api-fehler durch (getComments)", async () => {
        (api as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));

        await expect(
            getComments({
                repositoryId: "r",
                mrId: "1",
                branch: "b",
                version: "v",
            })
        ).rejects.toThrow("boom");
    });
});
