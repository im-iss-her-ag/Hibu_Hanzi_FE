/** Single swap point between the real voice modules (Team A/B) and the mock. */
import type { FeedbackCode, PitchEngine, PitchFrame, SpeakerRange, Tone, ToneResult } from '../voice/types'
import { createMockPitchEngine, isMockVoice, mockHzToChao, mockScoreTone, MOCK_FEEDBACK_VI } from '../voice/mock'
import { getRange, calibrate, observeUtterance, resetRange } from '../voice/engine/range'
import { createPitchEngine } from '../voice/engine'
import * as scoring from '../voice/scoring'

export { getRange, calibrate, observeUtterance, resetRange }

export function makeEngine(scriptedTone: () => 1 | 2 | 3 | 4): PitchEngine {
  return isMockVoice() ? createMockPitchEngine(getRange, scriptedTone) : createPitchEngine()
}
export const usingMock = isMockVoice

const mock = isMockVoice()
export const hzToChao: (hz: number, r: SpeakerRange) => number = mock ? mockHzToChao : scoring.hzToChao
export const scoreTone: (f: PitchFrame[], t: Tone, r: SpeakerRange) => ToneResult = mock ? mockScoreTone : scoring.scoreTone
export function feedbackText(code: FeedbackCode, target: Tone): string {
  return mock ? MOCK_FEEDBACK_VI[code] : scoring.feedbackText(code, target)
}
/** Ordered Vietnamese lines for a result (includes "giữa thanh 2 và 3" hints). */
export function resultMessages(r: ToneResult): string[] {
  return mock ? r.feedback.map((c) => MOCK_FEEDBACK_VI[c]) : scoring.resultMessages(r)
}
