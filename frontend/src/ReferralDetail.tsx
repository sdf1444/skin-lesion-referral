import { useState } from 'react'
import { updateStatus } from './api'
import { STATUS_LABELS, type Referral, type Status } from './types'

const ACTION_LABELS: Record<Status, string> = {
  submitted: 'Reopen',
  under_review: 'Start review',
  accepted: 'Accept',
  rejected: 'Reject',
  completed: 'Mark completed',
  cancelled: 'Cancel referral',
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}

interface Props {
  referral: Referral
  onChange: (r: Referral) => void
}

export function ReferralDetail({ referral, onChange }: Props) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copy() {
    await navigator.clipboard.writeText(referral.letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function move(status: Status) {
    setBusy(true)
    setError(null)
    try {
      onChange(await updateStatus(referral.id, status))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="result-heading">
      <h2 id="result-heading">
        {referral.patientName} — priority <span className={referral.urgency}>{referral.urgency.toUpperCase()}</span>{' '}
        (score {referral.score.toFixed(2)})
      </h2>
      <p>
        Status: <StatusBadge status={referral.status} /> · Referrer: {referral.referrerName} · Site: {referral.site}
      </p>
      {referral.allowedTransitions.length > 0 && (
        <div className="actions" role="group" aria-label="Status actions">
          {referral.allowedTransitions.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => move(s)}>
              {ACTION_LABELS[s]}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}
      <pre>{referral.letter}</pre>
      <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy letter'}</button>
    </section>
  )
}
