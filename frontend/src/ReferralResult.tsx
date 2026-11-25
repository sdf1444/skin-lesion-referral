import { useState } from 'react'
import type { Referral } from './types'

export function ReferralResult({ referral }: { referral: Referral }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(referral.letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section aria-labelledby="result-heading">
      <h2 id="result-heading">
        Priority: <span className={referral.urgency}>{referral.urgency.toUpperCase()}</span> (score {referral.score.toFixed(2)})
      </h2>
      <pre>{referral.letter}</pre>
      <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy letter'}</button>
    </section>
  )
}
