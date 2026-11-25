import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReferral } from './api'
import { ReferralDetail } from './ReferralDetail'
import type { Referral } from './types'

export function ReferralDetailPage() {
  const { id = '' } = useParams()
  const [referral, setReferral] = useState<Referral | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getReferral(id, controller.signal)
      .then(setReferral)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load')
      })
    return () => controller.abort()
  }, [id])

  return (
    <>
      <p><Link to="/">← All referrals</Link></p>
      {error && <p role="alert" className="error">{error}</p>}
      {!error && !referral && <p role="status">Loading…</p>}
      {referral && <ReferralDetail referral={referral} onChange={setReferral} />}
    </>
  )
}
