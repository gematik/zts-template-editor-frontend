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

import { describe, it, expect } from 'vitest';
import router from '../../router/index';

describe('Router Konfiguration', () => {
    it('Test: enthält 4 Routen mit erwarteten Namen', () => {
        const names = router.getRoutes().map(r => r.name);
        expect(names).toContain('home');
        expect(names).toContain('projects');
        expect(names).toContain('newVersion');
        expect(names).toContain('versionDetails');
        expect(names).toContain('newVersionFrom');
        expect(names).not.toContain('authCallback');
        expect(new Set(names).size).toBe(5);
    });

    it('Test: Home Route hat korrekten Pfad und Lazy Component', () => {
        const r = router.getRoutes().find(r => r.name === 'home');
        expect(r?.path).toBe('/');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
    });

    it('Test: Projects Route korrekt konfiguriert', () => {
        const r = router.getRoutes().find(r => r.name === 'projects');
        expect(r?.path).toBe('/projects');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
    });

    it('Test: newVersion Route besitzt create Modus Prop', () => {
        const r = router.getRoutes().find(r => r.name === 'newVersion');
        expect(r?.path).toBe('/projects/:projectId/:packageName/versions/new');
        expect((r as any)?.props?.default).toEqual({ mode: 'create' });
    });

    it('Test: newVersion Route lädt Lazy Component', () => {
        const r = router.getRoutes().find(r => r.name === 'newVersion');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
    });

    it('Test: versionDetails Route besitzt edit Modus Prop und  workspace Parameter', () => {
        const r = router.getRoutes().find(r => r.name === 'versionDetails');
        expect(r?.path).toBe('/projects/:projectId/:packageName/versions/:version/:workspace');
        expect((r as any)?.props?.default).toEqual({ mode: 'edit' });
    });

    it('Test: versionDetails Route lädt Lazy Component', () => {
        const r = router.getRoutes().find(r => r.name === 'versionDetails');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
    });

    it('Test: newVersionFrom Route besitzt createFrom Modus Prop und workspace Parameter', () => {
        const r = router.getRoutes().find(r => r.name === 'newVersionFrom');
        expect(r?.path).toBe('/projects/:projectId/:packageName/versions/:version/:workspace/new');
        expect((r as any)?.props?.default).toEqual({ mode: 'createFrom' });
    });

    it('Test: newVersionFrom Route lädt Lazy Component', () => {
        const r = router.getRoutes().find(r => r.name === 'newVersionFrom');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
    });

    it('Test: newVersionFrom Route wird mit korrektem Pfad konfiguriert', () => {
        const r = router.getRoutes().find(r => r.name === 'newVersionFrom');
        expect(r?.path).toBe('/projects/:projectId/:packageName/versions/:version/:workspace/new');
        const loader = (r as any)?.components?.default;
        expect(typeof loader).toBe('function');
        expect((r as any)?.props?.default).toEqual({ mode: 'createFrom' });
    });

    it('Test: versionDetails wird mit workspace korrekt aufgelöst', () => {
        const loc = router.resolve({
            name: 'versionDetails',
            params: { projectId: 'p1', packageName: 'pkg', version: '1.0.0', workspace: 'dev' }
        });
        expect(loc.name).toBe('versionDetails');
        expect(loc.params).toMatchObject({
            projectId: 'p1',
            packageName: 'pkg',
            version: '1.0.0',
            workspace: 'dev'
        });
        expect(loc.href).toBe('/projects/p1/pkg/versions/1.0.0/dev');
    });

    it('Test: newVersion Route wird mit korrektem href aufgelöst', () => {
        const loc = router.resolve({
            name: 'newVersion',
            params: { projectId: 'p1', packageName: 'pkg' }
        });
        expect(loc.name).toBe('newVersion');
        expect(loc.href).toBe('/projects/p1/pkg/versions/new');
    });

    it('Test: newVersionFrom Route wird mit korrektem href aufgelöst', () => {
        const loc = router.resolve({
            name: 'newVersionFrom',
            params: { projectId: 'p1', packageName: 'pkg', version: '1.0.0', workspace: 'dev' }
        });
        expect(loc.name).toBe('newVersionFrom');
        expect(loc.params).toMatchObject({
            projectId: 'p1',
            packageName: 'pkg',
            version: '1.0.0',
            workspace: 'dev'
        });
        expect(loc.href).toBe('/projects/p1/pkg/versions/1.0.0/dev/new');
    });
});