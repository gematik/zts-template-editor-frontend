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

// branching.spec.ts
import { describe, it, expect } from 'vitest';
import {
    isProtectedBranch,
    getEffectiveDefaultBranch,
    getSaveContext,
    buildSaveMessage,
} from '../../../composables/templatesManagement/branching';
import { DEFAULT_BRANCH_FALLBACK, PROTECTED_BRANCHES } from '../../../composables/templatesManagement/constants';

describe('isProtectedBranch', () => {
    it('returns true for a protected branch', () => {
        const protectedBranch = Array.from(PROTECTED_BRANCHES)[0]!;

        expect(isProtectedBranch(protectedBranch)).toBe(true);
    });

    it('trims whitespace before checking', () => {
        const protectedBranch = Array.from(PROTECTED_BRANCHES)[0];

        expect(isProtectedBranch(`  ${protectedBranch}  `)).toBe(true);
    });

    it('returns false for an unprotected branch', () => {
        expect(isProtectedBranch('feature/1.2.3')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isProtectedBranch('')).toBe(false);
    });
});

describe('getEffectiveDefaultBranch', () => {
    it('returns the trimmed default branch if provided', () => {
        expect(getEffectiveDefaultBranch('  main  ')).toBe('main');
    });

    it('returns the fallback when input is undefined', () => {
        expect(getEffectiveDefaultBranch(undefined)).toBe(DEFAULT_BRANCH_FALLBACK);
    });

    it('returns the fallback when input is null', () => {
        expect(getEffectiveDefaultBranch(null)).toBe(DEFAULT_BRANCH_FALLBACK);
    });

    it('returns the fallback when input is only whitespace', () => {
        expect(getEffectiveDefaultBranch('   ')).toBe(DEFAULT_BRANCH_FALLBACK);
    });
});

describe('getSaveContext', () => {
    it('detects create mode correctly for "create"', () => {
        const result = getSaveContext({
            mode: 'create',
            selectedBranch: 'main',
            currentPkgVersion: '1.2.3',
            routeVersion: '0.9.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.isCreateMode).toBe(true);
    });

    it('detects create mode correctly for "createFrom"', () => {
        const result = getSaveContext({
            mode: 'createFrom',
            selectedBranch: 'main',
            currentPkgVersion: '1.2.3',
            routeVersion: '0.9.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.isCreateMode).toBe(true);
    });

    it('detects non-create mode correctly for "edit"', () => {
        const result = getSaveContext({
            mode: 'edit',
            selectedBranch: 'main',
            currentPkgVersion: '1.2.3',
            routeVersion: '0.9.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.isCreateMode).toBe(false);
    });

    it('uses a feature branch in create mode when currentPkgVersion exists', () => {
        const result = getSaveContext({
            mode: 'create',
            selectedBranch: 'dev',
            currentPkgVersion: '1.2.3',
            routeVersion: '0.9.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.targetBranch).toBe('feature/1.2.3');
        expect(result.targetVersion).toBe('1.2.3');
    });

    it('uses selectedBranch in create mode when currentPkgVersion is empty', () => {
        const result = getSaveContext({
            mode: 'create',
            selectedBranch: 'dev',
            currentPkgVersion: '',
            routeVersion: '0.9.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.targetBranch).toBe('dev');
        expect(result.targetVersion).toBe('');
    });

    it('uses feature branch in edit mode when shouldEditViaFeatureBranch is true', () => {
        const result = getSaveContext({
            mode: 'edit',
            selectedBranch: 'main',
            currentPkgVersion: '2.0.0',
            routeVersion: '1.0.0',
            shouldEditViaFeatureBranch: true,
        });

        expect(result.targetBranch).toBe('feature/2.0.0');
        expect(result.targetVersion).toBe('2.0.0');
        expect(result.saveOnFeatureBranch).toBe(true);
    });

    it('falls back to routeVersion for resolved edit version when currentPkgVersion is empty', () => {
        const result = getSaveContext({
            mode: 'edit',
            selectedBranch: 'main',
            currentPkgVersion: '',
            routeVersion: ' 1.5.0 ',
            shouldEditViaFeatureBranch: true,
        });

        expect(result.targetBranch).toBe('feature/1.5.0');
        expect(result.targetVersion).toBe('1.5.0');
    });

    it('uses selectedBranch in edit mode when shouldEditViaFeatureBranch is false', () => {
        const result = getSaveContext({
            mode: 'edit',
            selectedBranch: 'release',
            currentPkgVersion: '2.1.0',
            routeVersion: '2.0.0',
            shouldEditViaFeatureBranch: false,
        });

        expect(result.targetBranch).toBe('release');
        expect(result.targetVersion).toBe('2.1.0');
        expect(result.saveOnFeatureBranch).toBe(false);
    });
});

describe('buildSaveMessage', () => {
    it('returns create message in create mode', () => {
        const result = buildSaveMessage({
            isCreateMode: true,
            saveOnFeatureBranch: false,
            isVersionReleased: false,
            routeVersion: '1.0.0',
            packageName: 'test-package',
            targetVersion: '2.0.0',
            targetBranch: 'feature/2.0.0',
        });

        expect(result).toBe(
            'Neues Package für die Version 2.0.0 des FHIR Package test-package auf Branch feature/2.0.0 erstellt',
        );
    });

    it('returns feature-branch edit message when saveOnFeatureBranch is true', () => {
        const result = buildSaveMessage({
            isCreateMode: false,
            saveOnFeatureBranch: true,
            isVersionReleased: true,
            routeVersion: '1.0.0',
            packageName: 'test-package',
            targetVersion: '2.0.0',
            targetBranch: 'feature/2.0.0',
        });

        expect(result).toBe(
            'Für die veröffentlichte Version 2.0.0 des FHIR Package test-package wurde eine bearbeitete Fassung auf Branch feature/2.0.0 erstellt',
        );
    });

    it('returns released-version save message when editing a released version without feature branch', () => {
        const result = buildSaveMessage({
            isCreateMode: false,
            saveOnFeatureBranch: false,
            isVersionReleased: true,
            routeVersion: '1.0.0',
            packageName: 'test-package',
            targetVersion: '2.0.0',
            targetBranch: 'main',
        });

        expect(result).toBe(
            'Änderungen für die Version 2.0.0 des FHIR Package test-package wurden gespeichert',
        );
    });

    it('returns default update message for normal edit flow', () => {
        const result = buildSaveMessage({
            isCreateMode: false,
            saveOnFeatureBranch: false,
            isVersionReleased: false,
            routeVersion: '1.0.0',
            packageName: 'test-package',
            targetVersion: '2.0.0',
            targetBranch: 'main',
        });

        expect(result).toBe(
            'Das Package für die Version 1.0.0 des FHIR Package test-package wurde aktualisiert',
        );
    });
});
