import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const referral = {
  id: '1', patientName: 'Jane Doe', patientAge: 55, site: 'arm', score: 0.4, urgency: 'soon',
  factors: [], model: 'm', letter: 'Dear Colleague', createdAt: '2025-01-01',
}

async function fillAndSubmit(file: File) {
  const user = userEvent.setup({ applyAccept: false })
  await user.type(screen.getByLabelText('Patient name'), 'Jane Doe')
  await user.type(screen.getByLabelText('Patient age'), '55')
  await user.type(screen.getByLabelText('Lesion site'), 'arm')
  await user.type(screen.getByLabelText('Referrer name'), 'Dr Smith')
  await user.upload(screen.getByLabelText(/Lesion photo/), file)
  await user.click(screen.getByLabelText('Evolving'))
  fireEvent.submit(screen.getByRole('form', { name: 'Referral form' }))
}

describe('App', () => {
  afterEach(() => vi.restoreAllMocks())

  it('submits explicit booleans and shows the letter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => referral })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await fillAndSubmit(new File(['x'], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('Dear Colleague')).toBeInTheDocument()
    const body = fetchMock.mock.calls[0][1].body as FormData
    expect(body.get('evolving')).toBe('true')
    expect(body.get('asymmetry')).toBe('false')
  })

  it('rejects a non-image locally without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await fillAndSubmit(new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText('Photo must be JPEG or PNG')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows API validation errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ message: ['patientAge must not be greater than 120'] }) }))
    render(<App />)
    await fillAndSubmit(new File(['x'], 'a.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('patientAge must not be greater than 120'))
  })
})
