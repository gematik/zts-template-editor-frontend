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

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/projects", () => ({
  listProjects: vi.fn(),
  listVersions: vi.fn(),
}));

vi.mock("../../api/workspaces", () => ({
  listBranches: vi.fn(),
}));

import { fetchProjects, loadMrStatusForVersions, fetchDefaultBranch, fetchDefaultBranchVersions } from "../../services/projectService";
import type { ProjectItem, VersionItem } from "../../types";

import * as projectApi from "../../api/projects";
import * as workspaceApi from "../../api/workspaces";

const mockProject: ProjectItem = {
  projectId: 42,
  description: "Projektbeschreibung",
  title: "KDL",
  lastModified: "2023-11-24",
};

const defaultVersions: VersionItem[] = [
  { version: "2025.0.0", lastModified: "2025-10-01" } as VersionItem,
  { version: "2025.0.1", lastModified: "2025-10-15" } as VersionItem,
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("projectService (updated)", () => {
  it("fetchProjects: lädt Projekte korrekt", async () => {
    vi.spyOn(projectApi, "listProjects").mockResolvedValueOnce([mockProject]);

    const projects = await fetchProjects();
    expect(projectApi.listProjects).toHaveBeenCalledOnce();
    expect(projects).toEqual([mockProject]);
  });

  describe("fetchDefaultBranch", () => {
    it("findet und gibt Default-Branch zurück", async () => {
      const branches = [
        { branch: "feature/x", isDefaultBranch: false },
        { branch: "main", isDefaultBranch: true },
      ] as any;

      const listSpy = vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce(branches);

      const result = await fetchDefaultBranch(42);
      expect(listSpy).toHaveBeenCalledWith({ repositoryId: "42" });
      expect(result).toEqual({ branch: "main", isDefaultBranch: true });
    });

    it("gibt null zurück, wenn kein Default-Branch vorhanden ist", async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "dev", isDefaultBranch: false },
        { branch: "feature/2025.0.0", isDefaultBranch: false },
      ] as any);

      const result = await fetchDefaultBranch(99);
      expect(result).toBeNull();
    });
  });

  describe("fetchDefaultBranchVersions", () => {
    it("branch nicht default -> [] und warn geloggt", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
      const notDefault = { branch: "dev", isDefaultBranch: false } as any;

      const versions = await fetchDefaultBranchVersions(7, notDefault);

      expect(versions).toEqual([]);
      expect(projectApi.listVersions).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();

      const [prefix, message] = warnSpy.mock.calls[0] as [string, string];
      expect(prefix).toEqual(
        expect.stringContaining("[TplEditor][projectService][WARN]"),
      );
      expect(message).toBe("No default branch found for project 7.");

      warnSpy.mockRestore();
    });

    it("lädt Versionen und annotiert branch korrekt", async () => {
      const defaultBranch = { branch: "main", isDefaultBranch: true } as any;
      const apiVersions = [
        { version: "1.0.0", lastModified: "2025-10-01" },
        { version: "1.1.0", lastModified: "2025-10-15" },
      ] as any;

      const listSpy = vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce(apiVersions);

      const result = await fetchDefaultBranchVersions(42, defaultBranch);
      expect(listSpy).toHaveBeenCalledWith(42, "main");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ version: "1.0.0", lastModified: "2025-10-01", branch: "main" });
      expect(result[1]).toEqual({ version: "1.1.0", lastModified: "2025-10-15", branch: "main" });
    });
  });

  describe("loadMrStatusForVersions", () => {
    it("gibt [] zurück, wenn kein Default Branch (isDefaultBranch && isProtected) vorhanden ist", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "feature/2025.0.0", isDefaultBranch: false, isProtected: false },
        { branch: "main", isDefaultBranch: true, isProtected: false },
      ] as any);

      const spyListVersions = vi.spyOn(projectApi, "listVersions");

      const result = await loadMrStatusForVersions(mockProject);

      expect(workspaceApi.listBranches).toHaveBeenCalledOnce();
      expect(spyListVersions).not.toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();

      const [prefix, message] = warnSpy.mock.calls[0] as [string, string];
      expect(prefix).toEqual(
        expect.stringContaining("[TplEditor][projectService][WARN]"),
      );
      expect(message).toBe("No default branch found for project 42.");

      warnSpy.mockRestore();
    });

    it('Default-Branch-Versionen: mrStatus "Final", mr aus defaultBranch.mergeRequest, branch gesetzt', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        {
          branch: "main",
          isDefaultBranch: true,
          isProtected: true,
          mergeRequest: { id: 1 },
        },
      ] as any);

      vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce(defaultVersions);

      const result = await loadMrStatusForVersions(mockProject);

      expect(projectApi.listVersions).toHaveBeenCalledWith(42, "main");
      expect(result).toHaveLength(2);

      const v0 = result.find((x) => x.version === "2025.0.0")!;
      expect(v0.mrStatus).toBe("Final");
      expect(v0.mergeRequest).toEqual({ id: 1 });
      expect(v0.branch).toBe("main");
    });

    it('Feature-Branch mit MR auf bereits releaster Version -> zusätzlicher Released-Edit-Eintrag', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        {
          branch: "feature/2025.0.0",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: { id: 99 },
          lastModified: "2025-10-20",
        },
      ] as any);

      vi.spyOn(projectApi, "listVersions")
        .mockResolvedValueOnce(defaultVersions); // main

      const result = await loadMrStatusForVersions(mockProject);

      expect(projectApi.listVersions).toHaveBeenCalledWith(42, "main");
      expect(projectApi.listVersions).toHaveBeenCalledTimes(1);

      const released = result.find((x) => x.version === "2025.0.0" && x.branch === "feature/2025.0.0")!;
      const base = result.find((x) => x.version === "2025.0.0" && x.branch === "main")!;
      expect(base.mrStatus).toBe("Final");
      expect(released.mrStatus).toBe("Released Edit");
      expect(released.mergeRequest).toEqual({ id: 99 });
    });

    it('Feature-Branch ohne MR: Draft wird hinzugefügt, wenn Version nicht im Default existiert', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        {
          branch: "feature/2026.0.0",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: null,
          lastModified: "2026-01-02",
        },
      ] as any);

      vi.spyOn(projectApi, "listVersions")
        .mockResolvedValueOnce(defaultVersions); // main

      const result = await loadMrStatusForVersions(mockProject);

      const added = result.find((x) => x.version === "2026.0.0")!;
      expect(added.mrStatus).toBe("Draft");
      expect(added.mergeRequest).toBeNull();
      expect(added.branch).toBe("feature/2026.0.0");
    });

    it("Feature-Branch: branch wird ohne Feature-listVersions-Prüfung als Draft aufgenommen", async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        { branch: "feature/2027.0.0", isDefaultBranch: false, isProtected: false, mergeRequest: null },
      ] as any);

      vi.spyOn(projectApi, "listVersions")
        .mockResolvedValueOnce(defaultVersions); // main

      const result = await loadMrStatusForVersions(mockProject);

      expect(result.map((x) => x.version).sort()).toEqual(["2025.0.0", "2025.0.1", "2027.0.0"]);
      const added = result.find((x) => x.version === "2027.0.0")!;
      expect(added.mrStatus).toBe("Draft");
    });

    it("Feature-Branch: skip wenn Branchname nicht feature/x.y.z matcht (Regex branch)", async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        { branch: "feature/not-a-version", isDefaultBranch: false, isProtected: false, mergeRequest: { id: 5 } },
      ] as any);

      vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce([...defaultVersions]);

      const result = await loadMrStatusForVersions(mockProject);

      expect(projectApi.listVersions).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it("Fehler beim Laden der Default-Versionen wird durchgereicht", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        { branch: "feature/2026.0.0", isDefaultBranch: false, isProtected: false, mergeRequest: null },
      ] as any);

      vi.spyOn(projectApi, "listVersions")
        .mockRejectedValueOnce(new Error("BoomDefault"));

      await expect(loadMrStatusForVersions(mockProject)).rejects.toThrow("BoomDefault");

      warnSpy.mockRestore();
    });

    it('mischt Ergebnisse: Default Final + Feature MR ergibt Released Edit auf Feature-Branch', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
        { branch: "feature/2025.0.1", isDefaultBranch: false, isProtected: false, mergeRequest: { id: 2 } },
      ] as any);

      vi.spyOn(projectApi, "listVersions")
        .mockResolvedValueOnce(defaultVersions); // main

      const result = await loadMrStatusForVersions(mockProject);

      const v1 = result.find((x) => x.version === "2025.0.1" && x.branch === "main")!;
      const v2 = result.find((x) => x.version === "2025.0.1" && x.branch === "feature/2025.0.1")!;

      expect(v1.mrStatus).toBe("Final");
      expect(v2.mrStatus).toBe("Released Edit");
      expect(v2.mergeRequest).toEqual({ id: 2 });
    });

    it('sortiert Nicht-Final nach Status und letzter Änderung, Final nach Version', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        {
          branch: "main",
          isDefaultBranch: true,
          isProtected: true,
          mergeRequest: null,
        },
        {
          branch: "feature/2026.0.0",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: { id: 11 },
          lastModified: "2026-01-10",
        },
        {
          branch: "feature/2025.0.2",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: { id: 12 },
          lastModified: "2026-01-11",
        },
        {
          branch: "feature/2027.0.0",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: null,
          lastModified: "2027-01-01",
        },
        {
          branch: "feature/2025.0.1",
          isDefaultBranch: false,
          isProtected: false,
          mergeRequest: { id: 13 },
          lastModified: "2026-01-12",
        },
      ] as any);

      vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce([
        { version: "2026.0.0", lastModified: "2026-01-01" },
        { version: "2025.0.1", lastModified: "2025-11-01" },
      ] as any);

      const result = await loadMrStatusForVersions(mockProject);
      const ordered = result.map((v) => `${v.mrStatus}|${v.version}|${v.branch}`);

      expect(ordered).toEqual([
        "Released Edit|2025.0.1|feature/2025.0.1",
        "in Review|2025.0.2|feature/2025.0.2",
        "Released Edit|2026.0.0|feature/2026.0.0",
        "Draft|2027.0.0|feature/2027.0.0",
        "Final|2026.0.0|main",
        "Final|2025.0.1|main",
      ]);
    });

    it('Final-Sortierung: semver vor non-semver, non-semver lexikographisch absteigend', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
      ] as any);

      vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce([
        { version: "aaa", lastModified: "2026-01-01" },
        { version: "2.0.0", lastModified: "2026-01-01" },
        { version: "zzz", lastModified: "2026-01-01" },
      ] as any);

      const result = await loadMrStatusForVersions(mockProject);
      const finals = result.filter((v) => v.mrStatus === "Final").map((v) => v.version);

      expect(finals).toEqual(["2.0.0", "zzz", "aaa"]);
    });

    it('Sortier-Fallback: bei identischer Version+Zeit bleibt Reihenfolge deterministisch über Branch-Fallback', async () => {
      vi.spyOn(workspaceApi, "listBranches").mockResolvedValueOnce([
        { branch: "main", isDefaultBranch: true, isProtected: true, mergeRequest: null },
      ] as any);

      vi.spyOn(projectApi, "listVersions").mockResolvedValueOnce([
        { version: "1.2.3", lastModified: "2026-01-01" },
        { version: "1.2.3", lastModified: "2026-01-01" },
      ] as any);

      const result = await loadMrStatusForVersions(mockProject);

      expect(result).toHaveLength(1);
      expect(result[0]?.version).toBe("1.2.3");
      expect(result[0]?.branch).toBe("main");
      expect(result[0]?.mrStatus).toBe("Final");
    });
  });
});
