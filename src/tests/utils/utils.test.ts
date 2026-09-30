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

import { describe, it, expect } from 'vitest'
import { fmtDate, limitMd, compareSemverDesc } from '../../utils/utils';

describe('fmtDate', () => {
    it('Test: gibt "-" für undefined zurück', () => {
        expect(fmtDate(undefined)).toBe('-')
    })

    it('Test: formatiert ein Date Objekt konsistent', () => {
        const d = new Date(2023, 11, 9, 8, 7) 
        const expected = new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d)
        expect(fmtDate(d)).toBe(expected)
    })

    it('Test: formatiert gleiches Datum aus ISO String identisch', () => {
        const d = new Date(2023, 11, 9, 8, 7)
        const iso = d.toISOString()
        const formattedDate = fmtDate(d)
        const formattedIso = fmtDate(iso)
        expect(formattedIso).toBe(formattedDate)
    })

    it('Test: enthält erwartete Komponenten (lokalunabhängig)', () => {
        const d = new Date(2023, 11, 9, 8, 7)
        const out = fmtDate(d)
        const digits = out.replace(/\D+/g, ' ').trim().split(/\s+/)
       
        expect(digits.length).toBeGreaterThanOrEqual(5)
        expect(out).toMatch(/2023/)
        expect(out).toMatch(/12/) 
        expect(out).toMatch(/09/)
        expect(out).toMatch(/08/)
        expect(out).toMatch(/07/)
    })

    it('Test: gibt Originalstring bei ungültigem Datum zurück', () => {
        expect(fmtDate('not-a-date')).toBe('not-a-date')
    })
})

describe('limitMd', () => {
    it('Test: lässt String unverändert bei Länge <= 5000', () => {
        const s = 'a'.repeat(5000)
        expect(limitMd('k1', s)).toBe(s)
    })

    it('Test: kürzt String bei Länge > 5000', () => {
        const s = 'b'.repeat(5001)
        const out = limitMd('k2', s)
        expect(out.length).toBe(5000)
        expect(out).toBe(s.slice(0, 5000))
    })

    it('Test: behandelt mehrere Keys unabhängig', () => {
        const a = limitMd('a', 'x'.repeat(10))
        const b = limitMd('b', 'y'.repeat(6000))
        expect(a).toBe('x'.repeat(10))
        expect(b).toBe('y'.repeat(5000))
    })
})

describe('compareSemverDesc', () => {
    it('Test: deckt alle Entscheidungszweige ab', () => {
        // Branch 1: semver.rcompare liefert ungleich 0.
        expect(compareSemverDesc('1.2.0', '1.10.0')).toBeGreaterThan(0)

        // Branch 2: Semver gleich -> numerischer localeCompare entscheidet.
        expect(compareSemverDesc('v1.2.3-b', 'v1.2.3-a')).toBeLessThan(0)

        // Branch 3: Numerischer Vergleich ist 0 -> finaler lexikalischer Tie-Breaker.
        expect(compareSemverDesc('2026.100.0123', '2026.100.123')).toBeGreaterThan(0)
    })
})