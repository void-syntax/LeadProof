import { calls } from '@/lib/data'
import { MOCK_RESULTS } from '@/lib/mock-data'

const PYTHON_URL = process.env.PYTHON_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
const TIMEOUT_MS = 15000

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { call_id?: unknown } | null
  const callId = typeof body?.call_id === 'string' ? body.call_id : null
  if (!callId) return Response.json({ error: 'call_id is required' }, { status: 400 })

  const call = calls.find((c) => c.call_id === callId)
  if (!call) return Response.json({ error: 'Call not found' }, { status: 404 })

  // 1. Forward request to Python audit service with a 15-second timeout
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const pyResponse = await fetch(`${PYTHON_URL}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id: callId, call }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (pyResponse.ok) {
      const pyData = await pyResponse.json()
      return Response.json({ source: 'live', result: pyData.result || pyData })
    }
  } catch (err) {
    console.warn(`[Audit Route] Python service failed or timed out (${PYTHON_URL}):`, err)
  }

  // 2. Fallback to mock / cached result
  const mockResult = MOCK_RESULTS[callId] || {
    ...MOCK_RESULTS['C-016'],
    call_id: callId,
  }

  return Response.json({ source: 'mock', result: mockResult })
}
