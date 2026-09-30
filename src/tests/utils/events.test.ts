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

import { describe, it, expect, vi } from 'vitest';
import {
  REVIEW_APPROVED_EVENT,
  dispatchReviewApproved,
  isReviewApprovedEvent,
} from '../../utils/events';

describe('events utils', () => {
  it('dispatchReviewApproved: dispatcht Event mit Name und Detail', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    dispatchReviewApproved({ projectId: 42, mrId: 7 });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const evt = dispatchSpy.mock.calls[0]?.[0];
    expect(evt).toBeInstanceOf(CustomEvent);
    expect(evt?.type).toBe(REVIEW_APPROVED_EVENT);
    expect((evt as CustomEvent).detail).toEqual({ projectId: 42, mrId: 7 });
  });

  it('isReviewApprovedEvent: true bei gültigem Event', () => {
    const evt = new CustomEvent(REVIEW_APPROVED_EVENT, {
      detail: { projectId: 1, mrId: 2 },
    });

    expect(isReviewApprovedEvent(evt)).toBe(true);
  });

  it('isReviewApprovedEvent: false bei ungültigem Detail', () => {
    const evt = new CustomEvent(REVIEW_APPROVED_EVENT, {
      detail: { projectId: '1', mrId: 2 },
    });

    expect(isReviewApprovedEvent(evt)).toBe(false);
  });

  it('isReviewApprovedEvent: false bei nicht-CustomEvent', () => {
    const evt = new Event(REVIEW_APPROVED_EVENT);

    expect(isReviewApprovedEvent(evt)).toBe(false);
  });
});
