import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createReferral } from './api'
import { ReferralForm } from './ReferralForm'

export function NewReferralPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One key per distinct payload: retries and double-clicks replay the same referral instead of duplicating it.
  const idempotencyKey = useRef(crypto.randomUUID())
  const inFlight = useRef(false)

  async function submit(form: FormData) {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const referral = await createReferral(form, idempotencyKey.current)
      navigate(`/referrals/${referral.id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSubmitting(false)
    } finally {
      inFlight.current = false
    }
  }

  return (
    <>
      <p><Link to="/">← All referrals</Link></p>
      <h2>New referral</h2>
      <p className="warn">Decision-support prototype using a rule-based score. Not a validated diagnostic tool.</p>
      <ReferralForm
        disabled={submitting}
        onSubmit={submit}
        onEdit={() => {
          idempotencyKey.current = crypto.randomUUID()
        }}
      />
      {error && <p role="alert" className="error">{error}</p>}
    </>
  )
}
