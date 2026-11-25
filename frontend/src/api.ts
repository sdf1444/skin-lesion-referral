import type { Referral } from './types'

export class ApiError extends Error {}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] }
    return Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? res.statusText)
  } catch {
    return res.statusText || `Request failed (${res.status})`
  }
}

export async function createReferral(form: FormData, signal?: AbortSignal): Promise<Referral> {
  const res = await fetch('/api/referrals', { method: 'POST', body: form, signal })
  if (!res.ok) throw new ApiError(await errorMessage(res))
  return (await res.json()) as Referral
}
