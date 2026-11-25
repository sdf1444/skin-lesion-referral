import { useRef, useState } from 'react'
import { createReferral } from './api'
import type { Referral } from './types'

export type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'success'; referral: Referral }

export function useSubmitReferral() {
  const [state, setState] = useState<SubmitState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  async function submit(form: FormData) {
    controller.current?.abort()
    controller.current = new AbortController()
    setState({ status: 'submitting' })
    try {
      const referral = await createReferral(form, controller.current.signal)
      setState({ status: 'success', referral })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Something went wrong' })
    }
  }

  return { state, submit }
}
