import type { Referral, Status, User } from './types'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null

// The auth context registers here so any 401 from a protected call signs the user out in the UI.
export function setUnauthorizedListener(fn: (() => void) | null) {
  onUnauthorized = fn
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] }
    return Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? res.statusText)
  } catch {
    return res.statusText || `Request failed (${res.status})`
  }
}

async function request<T>(path: string, init: RequestInit = {}, opts: { auth401?: boolean } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...init })
  if (!res.ok) {
    if (res.status === 401 && opts.auth401 !== false) onUnauthorized?.()
    throw new ApiError(await errorMessage(res), res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const json = (body: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const login = (email: string, password: string) =>
  request<User>('/auth/login', { method: 'POST', ...json({ email, password }) }, { auth401: false })

export const logout = () => request<void>('/auth/logout', { method: 'POST' }, { auth401: false })

export const me = () => request<User>('/auth/me', {}, { auth401: false })

export const createReferral = (form: FormData, idempotencyKey: string, signal?: AbortSignal) =>
  request<Referral>('/referrals', {
    method: 'POST',
    body: form,
    headers: { 'Idempotency-Key': idempotencyKey },
    signal,
  })

export const listReferrals = (status?: Status, signal?: AbortSignal) =>
  request<Referral[]>(`/referrals${status ? `?status=${status}` : ''}`, { signal })

export const getReferral = (id: string, signal?: AbortSignal) => request<Referral>(`/referrals/${id}`, { signal })

export const updateStatus = (id: string, status: Status) =>
  request<Referral>(`/referrals/${id}/status`, { method: 'PATCH', ...json({ status }) })
