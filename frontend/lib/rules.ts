import { regulation } from './data'
import type { ActionCode, CriterionId, PromiseTopic } from './types'

export const TOPIC_LABEL: Record<PromiseTopic, string> = {
  completion_date: 'Completion date',
  discount: 'Discount',
  installment: 'Installment term',
  down_payment: 'Down payment',
  price: 'Price',
  mortgage_rate: 'Mortgage rate',
  other: 'Other condition',
}

export const ACTION_LABEL: Record<ActionCode, string> = {
  CORRECT_PROMISE: 'Correct promise',
  CALLBACK_TODAY: 'Callback today',
  INVITE_SHOWROOM: 'Invite to showroom',
  COACHING: 'Coaching',
  OK: 'OK',
}

export const criteriaDefinitions = (regulation.criteria || []) as {
  id: CriterionId
  name: string
  met_if: string
  weight: number
}[]
