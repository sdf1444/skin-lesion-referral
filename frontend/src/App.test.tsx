import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Referral, User } from './types'

const referrer: User = { id: 'u1', email: 'r@x.com', name: 'Rita Referrer', role: 'referrer' }
const specialist: User = { id: 'u2', email: 's@x.com', name: 'Sam Specialist', role: 'specialist' }

const referral: Referral = {
  id: '1', status: 'submitted', statusUpdatedAt: '2025-01-01', patientName: 'Jane Doe', patientAge: 55,
  site: 'arm', referrerName: 'Rita Referrer', score: 0.4, urgency: 'soon', factors: [], model: 'm',
  letter: 'Dear Colleague', createdAt: '2025-01-01', allowedTransitions: ['cancelled'],
}

const res = (status: number, body?: unknown) => ({
  ok: status < 400, status, statusText: 'x', json: async () => body,
})

type Handler = (url: string, init?: RequestInit) => ReturnType<typeof res> | undefined

function mockApi(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init) ?? res(404, { message: 'nope' }))
  vi.stubGlobal('fetch', fn)
  return fn
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('redirects unauthenticated users to the login page', async () => {
    mockApi((url) => (url === '/api/auth/me' ? res(401, { message: 'Unauthorized' }) : undefined))
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows an error on bad credentials and stays on login', async () => {
    mockApi((url) => {
      if (url === '/api/auth/me') return res(401, {})
      if (url === '/api/auth/login') return res(401, { message: 'Invalid email or password' })
    })
    renderAt('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), 'r@x.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    fireEvent.submit(screen.getByRole('form', { name: 'Login form' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('signs in and lands on the referral list', async () => {
    let signedIn = false
    mockApi((url) => {
      if (url === '/api/auth/me') return signedIn ? res(200, referrer) : res(401, {})
      if (url === '/api/auth/login') {
        signedIn = true
        return res(200, referrer)
      }
      if (url.startsWith('/api/referrals')) return res(200, [referral])
    })
    renderAt('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), 'r@x.com')
    await user.type(screen.getByLabelText('Password'), 'pw')
    fireEvent.submit(screen.getByRole('form', { name: 'Login form' }))
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Rita Referrer')).toBeInTheDocument()
  })

  it('signs out and redirects to the login page', async () => {
    const fetchMock = mockApi((url) => {
      if (url === '/api/auth/me') return res(200, referrer)
      if (url === '/api/auth/logout') return res(204)
      if (url.startsWith('/api/referrals')) return res(200, [])
    })
    renderAt('/')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
  })

  it('hides "New referral" from specialists and bounces them off the create route', async () => {
    mockApi((url) => {
      if (url === '/api/auth/me') return res(200, specialist)
      if (url.startsWith('/api/referrals')) return res(200, [referral])
    })
    renderAt('/referrals/new')
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.queryByText('New referral')).not.toBeInTheDocument()
  })

  it('renders only the server-allowed status actions and applies one', async () => {
    const fetchMock = mockApi((url, init) => {
      if (url === '/api/auth/me') return res(200, specialist)
      if (url === '/api/referrals/1/status' && init?.method === 'PATCH') {
        return res(200, { ...referral, status: 'under_review', allowedTransitions: ['accepted', 'rejected'] })
      }
      if (url === '/api/referrals/1') return res(200, { ...referral, allowedTransitions: ['under_review'] })
    })
    renderAt('/referrals/1')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Start review' }))
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!
    expect(JSON.parse(patch[1]!.body as string)).toEqual({ status: 'under_review' })
  })

  it('submits with an Idempotency-Key and explicit booleans, then opens the referral', async () => {
    const fetchMock = mockApi((url, init) => {
      if (url === '/api/auth/me') return res(200, referrer)
      if (url === '/api/referrals' && init?.method === 'POST') return res(201, referral)
      if (url === '/api/referrals/1') return res(200, referral)
    })
    renderAt('/referrals/new')
    const user = userEvent.setup({ applyAccept: false })
    await user.type(await screen.findByLabelText('Patient name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Patient age'), '55')
    await user.type(screen.getByLabelText('Lesion site'), 'arm')
    await user.upload(screen.getByLabelText(/Lesion photo/), new File(['x'], 'a.png', { type: 'image/png' }))
    await user.click(screen.getByLabelText('Evolving'))
    fireEvent.submit(screen.getByRole('form', { name: 'Referral form' }))
    expect(await screen.findByText('Dear Colleague')).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!
    const headers = post[1]!.headers as Record<string, string>
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    const body = post[1]!.body as FormData
    expect(body.get('evolving')).toBe('true')
    expect(body.get('asymmetry')).toBe('false')
    expect(body.has('referrerName')).toBe(false)
  })

  it('rejects a non-image locally and shows API errors', async () => {
    const fetchMock = mockApi((url, init) => {
      if (url === '/api/auth/me') return res(200, referrer)
      if (url === '/api/referrals' && init?.method === 'POST') {
        return res(400, { message: ['patientAge must not be greater than 120'] })
      }
    })
    renderAt('/referrals/new')
    const user = userEvent.setup({ applyAccept: false })
    await user.type(await screen.findByLabelText('Patient name'), 'Jane')
    await user.type(screen.getByLabelText('Patient age'), '55')
    await user.type(screen.getByLabelText('Lesion site'), 'arm')
    await user.upload(screen.getByLabelText(/Lesion photo/), new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Referral form' }))
    expect(await screen.findByText('Photo must be JPEG or PNG')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(false)

    await user.upload(screen.getByLabelText(/Lesion photo/), new File(['x'], 'a.png', { type: 'image/png' }))
    fireEvent.submit(screen.getByRole('form', { name: 'Referral form' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('patientAge must not be greater than 120'))
  })
})
