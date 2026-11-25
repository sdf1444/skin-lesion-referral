import './App.css'
import { ReferralForm } from './ReferralForm'
import { ReferralResult } from './ReferralResult'
import { useSubmitReferral } from './useSubmitReferral'

export default function App() {
  const { state, submit } = useSubmitReferral()

  return (
    <main>
      <h1>Skin Lesion Referral</h1>
      <p className="warn">Decision-support prototype using a rule-based score. Not a validated diagnostic tool.</p>
      <ReferralForm disabled={state.status === 'submitting'} onSubmit={submit} />
      {state.status === 'error' && <p role="alert" className="error">{state.message}</p>}
      {state.status === 'success' && <ReferralResult referral={state.referral} />}
    </main>
  )
}
