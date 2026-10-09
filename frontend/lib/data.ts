import callsJson from '@/data/calls.json'
import declarationJson from '@/data/declaration.json'
import expectedJson from '@/data/expected.json'
import regulationJson from '@/data/regulation.json'
import type { Call, ExpectedCase } from './types'

export const regulation = regulationJson
export const declaration = declarationJson

export const calls: Call[] = ((callsJson as any).calls || []).map((raw: any) => ({
  call_id: raw.call_id,
  manager: raw.manager,
  started_at: raw.started_at,
  duration_sec: raw.duration_sec,
  language: raw.language,
  segments: Array.isArray(raw.segments) ? raw.segments : [],
}))

export const expectedCases = (expectedJson.cases || []) as ExpectedCase[]

export const LANGUAGE_LABEL: Record<Call['language'], string> = {
  ru: 'RU',
  az: 'AZ',
  mixed: 'MIX',
  en: 'EN',
}
